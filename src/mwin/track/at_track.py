from typing import override, Callable, Tuple, Dict, Any
from .base import BaseTracker, TrackerOptions
from ..helper import args_helper, inspect_helper

class AITraceTracker(BaseTracker):
    """AITraceTracker is to track the agent inputs and outputs"""
    
    def __init__(self):
        super().__init__()
        # store and restore calling llm stacks to track llm inputs and outputs.
        self._llm_track_frames = []
    
    @override
    def start_inputs_args_preprocess(
        self,
        func: Callable,
        tracker_options: TrackerOptions | None,
        args: Tuple,
        kwargs: Dict[str, Any]
    ) -> args_helper.StartArguments:
        
        inputs: Dict[str, Any] = inspect_helper.parse_to_dict_input(
            func=func,
            args=args,
            kwargs=kwargs
        )
        func_name = inspect_helper.get_call_name(func=func, args=args)

        return args_helper.StartArguments(
            func_name=func_name,
            tags=tracker_options.tags,
            input=inputs,
            model=tracker_options.model,
        )

    @override
    def end_output_exception_preprocess(
        self,
        func:Callable,
        output: Any | None,
        error_info: str | None,
        tracker_options: TrackerOptions,
    ) -> args_helper.EndArguments:
        
        final_output = {}
        llm_usage = None
        
        if output: 
            final_output['func_output'] = output
        else:
            final_output['func_output'] = None

        return args_helper.EndArguments(
            tags=tracker_options.tags,
            output=final_output,
            model=tracker_options.model,
            error_info=error_info,
            usage=llm_usage,
        )
