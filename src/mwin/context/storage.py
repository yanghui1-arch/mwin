from typing import Tuple
from contextvars import ContextVar

from ..models.key_models import Trace, Step

class AITraceStorageContext:
    """AI trace storage context stores the step and trace.
    This context can record a long calling stacks and stores them. The benefit is to easily visualize calling stacks and manage step or trace.

    For example, there is a complex track functions that solve a very complex math problem using agent.

    ```python
    final_answer = None
    complex_math_problem = "xxxxxx"
    final_answer = solve(complex_math_problem, previous_problem_answer=final_answer)

    print(final_answer)

    @track
    def solve(complex_math_problem, previous_problem_answer = None) -> str:

        sub_funcs = split_sub_func(complex_math_problem)

        if len(sub_funcs) == 1:
            return previous_problem_answer

        previous_func_solution = []
        for sub_func in sub_funcs:
            sub_func_solution = solve(
                complex_math_problem=sub_func, 
                previous_problem_answer=previous_func_solution
            )
            previous_func_solution.append(sub_func_solution)
        
        # agent solution logic
        return agent_solve(complex_math_problem, previous_func_solution)

    @track
    def split_sub_func(complex_math_problem) -> list:
        # split logic ...
        ...
    
    @track
    def agent_solve(complex_math_problem, previous_func_solution):
        # agent solve logic ...
        ...
    ```
    ID:                              1                           2                   3.1                 3.2             4     
    Now execution process is solve(complex_math_problem) -> split_sub_func -> [solve(sub_func) -> split_sub_func] -> agent_solve 
                                                                                ↑                       ↓
                                                                                 -----------------------
                                                                                        N times

    AITraceStorageContext will store the steps of solve, split_sub_func and agent_solve again and again and finally store the trace.
    ID 2 step is ID 1 step's child step. ID 3.2 is ID 3.1's child step. So the context step_stack will like as:
    STEP STACK:
        agent_solve
        split_sub_func   -----
                              |  N times
        solve(sub_func)  -----
        split_sub_func
        solve(complex_math_problem)
    """

    def __init__(self):
        """Initialize AITraceStorageContext"""
        
        self._trace: ContextVar[Trace] = ContextVar('current_trace', default=None)
        self._steps: ContextVar[Tuple[Step, ...]] = ContextVar('steps_calling_stack', default=tuple())

    def add_step(
        self,
        new_step: Step,
    ):
        """add a new step into steps_calling_stack
        
        Args:
            new_step(Step): a new step.
        """

        old_steps:Tuple = self._steps.get()
        old_steps += (new_step, )
        self._steps.set(old_steps)
    
    def pop_step(self) -> Step | None:
        """pop step stack to get the top step data and remove it
        
        Returns:
            Step | None: top step. If no steps retrun None.
        """

        steps = self._steps.get()
        if len(steps) == 0:
            return None

        top_step: Step = steps[-1]
        self._steps.set(steps[:-1])
        return top_step
    
    def get_top_step(self) -> Step | None:
        """get top step data
        The function works as stack. So top step is just get the top and not remove the top data.

        Returns:
            Step | None: top step data if self._steps has data else return None.
        """
        
        steps = self._steps.get()
        if len(steps) == 0:
            return None
        return steps[-1]
    
    def set_trace(self, current_trace: Trace | None):
        """set the current trace
        
        Args:
            current_trace(Trace | None): current trace. It maybe a None type for no current trace.
        """
        
        self._trace.set(current_trace)
    
    def pop_trace(self) -> Trace | None:
        """pop trace
        
        Returns:
            Trace | None: current trace. None means no trace now.
        """

        trace = self._trace.get()
        self._trace.set(None)
        return trace
    
    def get_current_trace(self) -> Trace | None:
        """get current trace data
        
        Returns:
            Trace | None: return current trace if has trace else return None
        """

        current_trace: Trace | None = self._trace.get()
        return current_trace

aitrace_storage_context = AITraceStorageContext()

"""
Celery task is running in the thread. The contextvar is the same value.
"""
try:
    from celery.signals import task_prerun

    @task_prerun.connect
    def _clear_trace_on_celery_task(**kwargs):
        aitrace_storage_context.set_trace(None)
except ImportError:
    pass
