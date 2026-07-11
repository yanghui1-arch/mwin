from enum import Enum

class PlatformType(Enum):
    CLOUD = (1, "mwin Cloud Platform (default)")
    LOCAL = (2, "mwin Local Platform")

    @classmethod
    def find_platform(cls, value: int) -> "PlatformType":
        """Find PlatformType by index.
        
        Args:
            value(int): index.
        
        Returns:
            PlatformType: platform type with index.

        Raises:
            ValueError: passing an invalid value.
        """

        for v in cls:
            if v.value[0] == value:
                return v
        raise ValueError(f"Invalid value. No compatible platform with value = {value}")

def ask_for_deployment_type() -> PlatformType:
    """ask user to choose one supported platform type.
    
    Returns:
        PlatformType: user platform choice.
    
    Raises:
        ValueError: pass an invalid value to PlatformType.find_platform() function.
    """

    query = ["Which deployment type do you choose?"]

    for deployment in PlatformType:
        query.append(f'{deployment.value[0]} - {deployment.value[1]}')

    query.append('Please input the choice number.>')
    query = '\n'.join(query)

    while True:
        choice_str = input(query).strip()
        if choice_str not in ("", "1", "2"):
            print(f"Wrong choice. Valid choice is 1, 2 and ''. User input: {choice_str}")
            continue
        if choice_str == '':
            choice = 1
        else:
            choice = int(choice_str)
        
        choose_platform = PlatformType.find_platform(choice)
        return choose_platform
