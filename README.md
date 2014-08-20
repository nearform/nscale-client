
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

A nfd system is represented by a set of connected containers that are configured, built and deployed to constitute a working platform for distributed applications.

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

## container

A container is a reusable and configurable system resource that can be built and deployed across one or more physical nodes.

The currently supported container types are docker (Docker container), aws-ami (Amazon machine image), aws-sg (Amazon security group), and aws-elb (Amazon load balancer).

### container list

To list all containers of a system execute `nfd container list`:

    Usage: nfd container list NAME

    Example:
    $ nfd container list nfd-demo

### container add

To add a container to a system execute `nfd container add`:

    Usage: nfd container add NAME

    Example:
    $ nfd container add nfd-demo
    prompt: type: docker

### container put

To update a container with a new revision execute `nfd container put`:

    Usage: nfd container put < FILE

    Example:
    $ nfd container put < container.json

### container delete

To delete a container from a system execute `nfd container delete`:

    Usage: nfd container delete NAME CONTAINER

    Example:
    $ nfd container delete nfd-demo web

### container build

To build a container of a system execute `nfd container build`:

    Usage: nfd container build NAME CONTAINER

    Example:
    $ nfd container build nfd-demo web

## Revision

A revision is a recorded system snapshot, automatically saved whenever there are system changes.

### revision list

To list all revisions of a system execute `nfd revision list`:

    Usage: nfd revision list NAME

    Example:
    $ nfd revision list nfd-demo

### revision get

To get a revision of a system execute `nfd revision get`:

    Usage: nfd revision get NAME REVISION

    Example:
    $ nfd revision get nfd-demo 33417ff8f1299c1b35c40b562c5b8310cf66a4cf

### revision deploy

To deploy a revision of a system execute `nfd revision deploy`:

    Usage: nfd revision deploy NAME REVISION

    Example:
    $ nfd revision deploy nfd-demo 33417ff8f1299c1b35c40b562c5b8310cf66a4cf

### revision mark

To mark a revision of a system as being deployed execute `nfd revision mark`:

    Usage: nfd revision mark NAME REVISION

    Example:
    $ nfd revision mark nfd-demo 33417ff8f1299c1b35c40b562c5b8310cf66a4cf

### revision preview

To preview the deploy workflow for a revision of a system execute `nfd revision preview`:

    Usage: nfd revision preview NAME REVISION

    Example:
    $ nfd revision preview nfd-demo 33417ff8f1299c1b35c40b562c5b8310cf66a4cf

