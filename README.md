
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

To authenticate with the nfd host execute `nfd login` and either login by username/password or with your github account.

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

To logout from the nfd host execute `nfd logout`:

    Usage: nfd logout

    Example:
    $ nfd logout

## system

A nfd system is represented by a set of containers that are configured, built and deployed to constitute a working platform for distributed applications.

### system create

To create a blank system execute `nfd system create`:

    Usage: nfd system create

    Example:
    $ nfd system create
    prompt: name: <name>
    prompt: namespace: <namespace>
    prompt: confirm (y/n): y

### system clone

To clone a system from an existing git repository execute `nfd system clone`:

    Usage: nfd system clone REPO

    Example:
    $ nfd system clone git@github.com:nearform/nfd-demo

### system sync

To sync a system with its git repository execute `nfd system sync`:

    Usage: nfd system sync NAME

    Example:
    $ nfd system sync nfd-demo

### system list

To list all systems execute `nfd system list`:

    Usage: nfd system list

    Example:
    $ nfd system list

### system put

To update a system with a new revision execute `nfd system put`:

    Usage: nfd system put < FILE

    Example:
    $ nfd system put < nfd-demo.json

### system deployed

To get the deployed revision of a system execute `nfd system deployed`:

    Usage: nfd system deployed NAME

    Example:
    $ nfd system deployed nfd-demo

### system analyze

To run an analysis of a system execute `nfd system analyze`:

    Usage: nfd system analyze NAME

    Example:
    $ nfd system analyze nfd-demo

### system check

To run and verify an analysis of a system execute `nfd system check`:

    Usage: nfd system check NAME

    Example:
    $ nfd system check nfd-demo









