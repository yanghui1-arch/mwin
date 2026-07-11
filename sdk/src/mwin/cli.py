import click
from importlib.metadata import version, PackageNotFoundError

from . import config as mwin_config
from .helper import cli_helper

CONTEXT_SETTINGS = {'help_option_names': ['--help', '-h']}

try:
    pkg_version = version('mwin')
except PackageNotFoundError:
    pkg_version = 'unknown'

@click.group(invoke_without_command=True, context_settings=CONTEXT_SETTINGS)
@click.version_option(pkg_version, *("--version", "-v"))
def cli():
    """minw CLI"""
    pass

@cli.command()
@click.option('--configure', is_flag=True, help='open configure mode.')
@click.option('--use_local', is_flag=True, help='Set it True if you want use local serve.')
def configure(
    configure: bool,
    use_local: bool
):
    if use_local:
        mwin_config.configure(
            use_local=True
        )

    else:
        platform_type: cli_helper.PlatformType = cli_helper.ask_for_deployment_type()
        if platform_type == cli_helper.PlatformType.CLOUD:
            mwin_config.configure()
        elif platform_type == cli_helper.PlatformType.LOCAL:
            mwin_config.configure(
                use_local=True
            )

        else:
            print("Invalid platform type is selected.")
            exit(1)

if __name__ == '__main__':
    cli()