import inspect
import os
import sys
from contextvars import Token
from typing import Callable, Any, Tuple, Dict, List, Literal
from abc import ABC, abstractmethod
from datetime import datetime
import functools

from .options import TrackerOptions
from .. import context
from ..context.func_context import current_function_name_context
from ..models.key_models import Step
from ..models.common import LLMProvider
from ..helper import args_helper, inspect_helper, exception_helper
from ..helper.llm import provider_helper
from ..logger import logger
from ..patches.llm_patch_config import set_llm_patch_config, reset_llm_patch_config



class BaseTracker(ABC):
    """ Base tracker to track all output
    Any decorated with tracker can be considered as a step.
    Every tracker should be extended `BaseTracker` class.
    Following methods need to be implemented in subclass.
        * start_inputs_args_preprocess: preprocess start input before calling function

    Args:
        provider(Optional[str]): provider name
    """

    def __init__(self):
        self.provider: str | None = None

    def track(
        self,
        func_name: str | Callable | None = None,
        project_name: str | None = None,
        tags: List[str] | None = None,
        step_type: Literal["general", "llm", "retrieve", "tool"] = "general",
        model: str | None = None,
        llm_provider: LLMProvider = LLMProvider.AUTO,
        llm_ignore_fields: List[str] | None = None,
        description: str | None = None,
    ) -> Callable:
        """track step decorator
        Track a function as a Step. Outside ``start_trace()``, the Step is
        exported independently with ``trace_id=None``. Inside a Trace scope,
        it belongs to that Trace.

        Args:
            func_name(str | Callable | None): caller can set it they want to name with 'str' type. If caller doesn't set, it will be `Callable`.
            project_name(str | None): project name of this function. Default to `None`. It is set only when you deploys two or more programs which are using mwin to track.
            tags(List[str] | None): tags of tracking steps. Default to `None`.
            step_type(Literal["general", "llm", "retrieve", "tool"]): step type. Default to `general`.
            model(str | None): using model name. Default to `None`. If you are using llama you can set the field to `llama`.
            llm_provider(LLMProvider): llm inference provider. Default to `AUTO`.
            llm_ignore_fields(List[str] | None): a list of llm ignore fields name. Default to `None`.
            description(str | None): step description. Default to `None`.

        Returns:
            Callable: decorator
        """

        def _passthrough(func: Callable) -> Callable:
            return func

        if os.environ.get("MWIN_ENABLE_TRACK_IN_TEST") != "1" and "pytest" in sys.modules:
            return func_name if callable(func_name) else _passthrough

        tracker_options = TrackerOptions(
            tags=tags,
            step_type=step_type,
            model=model,
            llm_provider=llm_provider,
            llm_ignore_fields=llm_ignore_fields,
            description=description,
            project_name=project_name,
        )

        if callable(func_name):
            func = func_name
            if description is None:
                tracker_options.description = inspect.getdoc(func)
            return self._decorator(func=func, tracker_options=tracker_options)

        tracker_options.func_name = func_name

        def decorator(func:Callable):
            if description is None:
                tracker_options.description = inspect.getdoc(func)
            return self._decorator(func=func, tracker_options=tracker_options)

        return decorator

    def _decorator(
        self,
        func: Callable,
        tracker_options: TrackerOptions
    ) -> Callable:
        """ Construct a decorator

        Args:
            func(Callable): a callable function
            tracker_options(TrackerOptions): tracker options

        Returns:
            Callable: track decorator
        """

        if inspect.iscoroutinefunction(func):
            return self._async_decorator(
                func=func,
                tracker_options=tracker_options,
            )

        return self._sync_decorator(
            func=func,
            tracker_options=tracker_options,
        )

    def _sync_decorator(
        self,
        func: Callable,
        tracker_options: TrackerOptions
    ) -> Callable:
        """Return a sync decorator
        If tracked function is a sync function use it.

        Args:
            func(Callable): a callable tracked function
            tracker_options(TrackerOptions): tracker options
        """

        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            start_arguments = self._prepare_start_arguments(
                func=func,
                tracker_options=tracker_options,
                args=args,
                kwargs=kwargs,
            )

            result = None
            func_exception: Exception | None = None
            error_info: str | None = None
            patched_token = self._before_calling_function(
                func=func,
                tracker_options=tracker_options,
                start_arguments=start_arguments,
            )
            token = current_function_name_context.set(func.__name__)
            try:
                result = func(*args, **kwargs)
            except Exception as error:
                error_info = exception_helper.collect_exception(str(error))
                func_exception = error
            finally:
                try:
                    self._after_calling_function(
                        func=func,
                        output=result,
                        error_info=error_info,
                        tracker_options=tracker_options,
                    )
                finally:
                    current_function_name_context.reset(token)
                    if patched_token is not None:
                        reset_llm_patch_config(token=patched_token)

            if func_exception is not None:
                raise func_exception
            return result

        return wrapper

    def _async_decorator(
        self,
        func: Callable,
        tracker_options: TrackerOptions
    ) -> Callable:
        """Return an async decorator
        If tracked function is an async function use it.

        Args:
            func(Callable): a callable tracked function
            tracker_options(TrackerOptions): tracker options
        """

        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            start_arguments = self._prepare_start_arguments(
                func=func,
                tracker_options=tracker_options,
                args=args,
                kwargs=kwargs,
            )

            result = None
            func_exception: Exception | None = None
            error_info: str | None = None
            patched_token = self._before_calling_function(
                func=func,
                tracker_options=tracker_options,
                start_arguments=start_arguments,
            )
            token = current_function_name_context.set(func.__name__)
            try:
                result = await func(*args, **kwargs)
            except Exception as error:
                error_info = exception_helper.collect_exception(str(error))
                func_exception = error
            finally:
                try:
                    self._after_calling_function(
                        func=func,
                        output=result,
                        error_info=error_info,
                        tracker_options=tracker_options,
                    )
                finally:
                    current_function_name_context.reset(token)
                    if patched_token is not None:
                        reset_llm_patch_config(token=patched_token)

            if func_exception is not None:
                raise func_exception
            return result

        return wrapper

    def _prepare_start_arguments(
        self,
        func: Callable,
        tracker_options: TrackerOptions,
        args: Tuple,
        kwargs: Dict[str, Any],
    ) -> args_helper.StartArguments:
        """Parse tracked function arguments with a safe fallback.

        Args:
            func: Tracked function.
            tracker_options: Configuration for the tracked function.
            args: Positional arguments passed to the function.
            kwargs: Keyword arguments passed to the function.

        Returns:
            Parsed inputs and metadata used to create the Step.
        """

        try:
            return self.start_inputs_args_preprocess(
                func=func,
                tracker_options=tracker_options,
                args=args,
                kwargs=kwargs,
            )
        except Exception as exception:
            logger.warning(
                "Mwin could not parse tracked function inputs",
                exc_info=True,
            )
            return args_helper.StartArguments(
                func_name=inspect_helper.get_call_name(func=func, args=args),
                tags=tracker_options.tags,
            )

    def _before_calling_function(
        self,
        func: Callable,
        tracker_options: TrackerOptions,
        start_arguments: args_helper.StartArguments,
    ) -> Token | None:
        """Create and register a Step before calling the tracked function.

        Args:
            func: Tracked function.
            tracker_options: Configuration for the tracked function.
            start_arguments: Parsed function inputs and metadata.

        Returns:
            Patch context token, or ``None`` when no provider patch context is
            required.
        """

        patch_token = None

        tracker_options.func_name = start_arguments.func_name

        new_step: Step = args_helper.create_new_step(
            input=start_arguments.input,
            name=tracker_options.func_name,
            type=tracker_options.step_type,
            tags=tracker_options.tags,
            model=tracker_options.model,
            usage=start_arguments.usage,
        )

        # add step to context
        context.add_storage_step(new_step=new_step)

        # start patch
        if tracker_options.llm_provider is not None:
            patch_token = set_llm_patch_config(step=new_step, tracker_options=tracker_options, func_name=func.__name__)

        if tracker_options.llm_provider in (
            LLMProvider.AUTO,
            LLMProvider.OPENAI,
            LLMProvider.OPEN_ROUTER,
            LLMProvider.KIMI,
            LLMProvider.DEEPSEEK,
            LLMProvider.GLM,
        ):
            from ..patches.openai import completions, async_completions
            completions.patch_openai_chat_completions()
            async_completions.patch_async_openai_chat_completions()

        return patch_token

    def _after_calling_function(
        self,
        func: Callable,
        output: Any,
        error_info: str | None,
        tracker_options: TrackerOptions,
    ):
        """ Prepare and log output after track function
        Log step, trace and then restore llm patched token which guarantees step-in and step-out.
        Restore patched_token is very important and neccessary.

        Arg:
            output(Any): output from decorated function.
            error_info(str | None): error information during executing decorated function.
            tracker_options(TrackerOption): tracker options.
        """

        try:
            end_args: args_helper.EndArguments = self.end_output_exception_preprocess(
                func=func,
                output=output,
                error_info=error_info,
                tracker_options=tracker_options
            )
        except Exception as e:
            print(str(e))

            if output and isinstance(output, Dict) is False:
                output = {'func_output': output}

            end_args = args_helper.EndArguments(
                tags=tracker_options.tags,
                output=output,
                model=tracker_options.model,
                error_info=error_info,
            )

        current_step: Step | None = context.pop_storage_step()
        if not current_step:
            # TODO: Log the error information and create a new step to prevent executing exception.
            current_step: Step = args_helper.create_new_step(
                name=tracker_options.func_name,
                type=tracker_options.step_type,
                tags=tracker_options.tags,
                model=tracker_options.model,
            )
        # update current step
        # TODO: improve update and try to encapsulate it
        func_inputs = current_step.input
        if not (
            isinstance(func_inputs, dict)
            and "func_inputs" in func_inputs
        ):
            current_step.input = {'func_inputs': func_inputs}

        # Until executing here
        if current_step.output is None:
            current_step.output = {}
        current_step.output['func_output'] = end_args.output.get('func_output', '<Error happens while accessing function output>')

        current_step.error_info = end_args.error_info
        current_step.description = tracker_options.description
        current_step.llm_provider = provider_helper.resolve_llm_provider(
            tracker_options.llm_provider,
            current_step.model,
        ).value
        current_step.end_time = datetime.now()

        context.complete_step(
            step=current_step,
            project_name=tracker_options.project_name,
            trace_output=end_args.output,
            error_info=error_info,
        )

    @abstractmethod
    def start_inputs_args_preprocess(
        self,
        func: Callable,
        tracker_options: TrackerOptions | None,
        args: Tuple,
        kwargs: Dict[str, Any]
    ):
        ...

    @abstractmethod
    def end_output_exception_preprocess(
        self,
        func: Callable,
        output: Any,
        error_info: str | None,
        tracker_options: TrackerOptions,
    ):
        ...
