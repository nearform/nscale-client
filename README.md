
# Command Line

To list available commands execute `nfd help`:

    $ nfd help

## nfd host

The nfd host is the server running the nfd system.

To set the ndf host execute `nfd use`:

    Usage: nfd use HOST [PORT]

    Example:
    $ nfd use localhost 3223

## login

There are two ways to authenticate to the nfd host, either by username/password or with your github account.

    Usage: nfd login

### username/password login

    $ nfd login
    prompt: nfd username / password login (y/n): y
    prompt: username: <username>
    prompt: password: <password>

### github login

First generate a new github personal access token in [https://github.com/settings/applications](https://github.com/settings/applications), remembering to select the 'repo' and 'user' scopes.

    $ nfd login
    prompt: nfd username / password login (y/n): n
    prompt: github access token: <personal access token>

## logout

Logout from the nfd host.

    Usage: nfd logout

    Example:
    $ nfd logout

