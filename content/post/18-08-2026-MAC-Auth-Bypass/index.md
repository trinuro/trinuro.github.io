---
title: "MAC Authentication Bypass (MAB)"
description: An explainer of something I learnt in Cisco's SDSI course
date: 2026-08-29T09:50:56-04:00
image: 
tags:
categories:
    - Personal Research
comments: false
---
1. RADIUS is a protocol for Authentication, Authorization and Accounting. Normally, RADIUS supports either credentials or certificate based access. However, now I know that those are not the only ways to authenticate to RADIUS!
2. MAC Authentication Bypass (MAB) is a way to authenticate using a machine's MAC address. In this case, the username and password field will be filled up with the machine's MAC address.
## Reasons of MAB
1. Any security-minded person will immediately think that is unsafe and it is true! MAC addresses are very easily spoofed using tools like Scapy.
2. However, for OT, IOT and legacy devices, MAB may be a necessary evil if it does not support credential or certificates based authentication.
3. MAB should always be used as a fallback to EAP/ 802.1X.
## How it Works
1. First, the switch will perform EAPoL (EAP over LAN) identity request 3 times, as it normally does.
2. If the device does not respond after 3 times, the switch assumes that the device does not have a 802.1X supplicant. It proceeds to perform MAB.
3. The switch accepts a frame from the device. The switch will record the source MAC address and discard the frame. It will then use the MAC address as the credentials to authenticate to the RADIUS server.
4. If the authentication succeeds, RADIUS would allow access and perform things like dynamic VLAN assignment and downloadable ACLs to restrict the access of the device to the network.
## Conclusion
1. MAB should only be used as a last resort as most modern IOT devices support certificate based authentication. If MAB needs to be used, implement the appropriate access controls.