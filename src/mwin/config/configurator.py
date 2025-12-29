import sys
import os
import getpass
from typing import Final, Dict

from .types import MwinConfig
from .loader import save_config
from .._client import client as at_client
from .._exception import APIKeyException

CLOUD_BASE_URL: Final[str] = "http://localhost:8080/api/v0"
localhost_base_url: str  = "http://localhost:8080/api/v0"

class MwinConfigurator:
    """AI trace configurator
    Use api key to connect with cloud serve or host local serve. Otherwise be unable to use anything
    about AT.
    User can get api key from cloud at `http://www.petmate.fun/`
    """

    def __init__(
        self,
        api_key: str | None = None,
        url: str | None = None,
        use_local: bool = False,
        project_name: str | None = None,
    ):
        """Initialize MwinConfigurator
        MwinConfigurator duty is to configure apikey, url and whether user start local option.

        Args:
            api_key(str | None): AT api key.
            url(str | None): connect url.
            use_local(bool): whether start local serve option. Default to `False`.
        """

        self._apikey = api_key
        self._use_local = use_local
        self._project_name = project_name

        if url is None:
            self._url = CLOUD_BASE_URL if self._use_local is False else localhost_base_url
        else:
            self._url = url
        
    def configure(self):
        """configure AT"""
        # TODO: skip configure when user configure one last time.

        if self.use_local is False:
            self._configure_cloud()
        else:
            self._configure_local()
        config = MwinConfig(
            project_name=self._project_name,
            apikey=self._apikey,
            url=self._url,
            use_local=self._use_local,
        )
        save_config(config=config)
        sys.stdout.write("Congrats to configure mwin.")

    def _configure_cloud(self):
        """configure AT cloud"""
        
        if not self._apikey:
            self._ask_for_apikey()
        if not self._project_name:
            self._ask_for_project_name()

    def _configure_local(self):
        """configure AT local"""
        if not self._apikey:
            self._ask_for_apikey()
        if not self._project_name:
            self._ask_for_project_name()

    def _ask_for_apikey(self):
        """ask user to input apikey and store it in OS."""
        if not self._apikey:
            apikey = getpass.getpass(prompt="Please enter your API key:")
            # validate apikey
            try:
                # temporarily cancel validation
                # self._validate_apikey(apikey=apikey)
                self._apikey = apikey

            except APIKeyException as apikey_exception:
                sys.stderr.write(str(apikey_exception))
            except Exception as exception:
                sys.stderr.write(str(exception))
    
    def _ask_for_project_name(self):
        """Ask user to input project name"""
        project_name_max_len = 40
        while not self._project_name:
            project_name = input("What's your project name? ")
            if project_name and len(project_name) < project_name_max_len:
                self._project_name = project_name
            else:
                sys.stderr.write(f"Invalid project name. Ensure that you have input project name and the length of name doesn't exceed {project_name_max_len} characters\n")

    def _validate_apikey(self, apikey: str | None):
        """ validate apikey is correct 
        
        Args:
            apikey(str | None): apikey to validate

        Raises:
            ValueError: pass a None apikey
            APIKeyException: APIKey is not valid
            Exception: something errors during requesting cloud serve.
        """
        
        if apikey is None:
            raise ValueError("Please set aitrace valid apikey first.")
        
        if self.use_local:
            import warnings
            warnings.warn("You are using local aitrace serve. So aitrace will not validate your apikey now.") 
        else:
            # using cloud serve
            import requests
            # TODO: encode apikey
            response:requests.Response = at_client.post(self.url + "/apikey/validate", json_data={"apikey": apikey})
            response_json:Dict = response.json()
            validation = response_json.get("apikey_valid", None)
            if validation is False:
                raise APIKeyException(error_msg=f"Invalid APIKey. You can check/get your apikey on the `{CLOUD_BASE_URL}`", url=self.url)
            if validation is True:
                sys.stdout.write("Success to validate apikey! Welcome to AItrace")
            else:
                raise Exception("Error happens when validate apikey.")

    @property
    def apikey(self) -> str | None:
        return self._apikey

    @property
    def use_local(self) -> bool:
        return self._use_local
    
    @property
    def url(self) -> str:
        return self._url

def configure(
    api_key: str | None = None,
    use_local: bool = False,
    url: str | None = None 
):
    """Configure AT
    
    Args:
        api_key(str | None): AT api key. Default to `None`.
        use_local(bool): whether start local serve option. Default to `False`.
        url(str | None): connect url
    """

    configurator = MwinConfigurator(
        api_key=api_key,
        use_local=use_local,
        url=url
    )
    configurator.configure()
