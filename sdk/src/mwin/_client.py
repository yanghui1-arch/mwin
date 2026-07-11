from typing import Any, Dict
import requests

class ATClient:

    def __init__(self):
        pass

    def post(
        self,
        url: str,
        api_key: str | None = None,
        data: Dict[str, Any] | None = None,
        json_data: Dict[str, Any] | None = None,
        timeout: int = 5
    ) -> requests.Response:
        """Post request
        
        Args:
            url(str): request url.
            data(Dict[str, Any] | None): body data. Default to `None`.
            json_data(Dict[str, Any] | None): json body data. Default to `None`.
            timeout(int): Exceed timeout.

        Returns:
            requests.Response: post response.
            
        Raises:
            requests.HTTPError: call ATClient.post without data and json at the same time.
        """
        
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        if not data and not json_data:
            raise requests.HTTPError("Invalid to call ATClient.post without data and json at the same time.")
        
        return requests.post(url=url, data=data, json=json_data, headers=headers, timeout=timeout)


    def get(
        self,
        url: str,
        api_key: str | None = None,
        params: Dict[str, Any] | None = None,
        timeout: int = 5
    ) -> requests.Response:
        """ requests.get function
        
        Args:
            url(str): requests.get url.
            api_key(str): AT api key
            params(Dict[str, Any] | None): request get query parameters. Default to `None`.
            timeout(int): request exceeds timeout. Default to `5`.
        """

        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        return requests.get(url=url, params=params, headers=headers, timeout=timeout)

client = ATClient()
