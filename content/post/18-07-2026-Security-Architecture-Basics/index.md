---
title: "Designing Secure Infrastructure"
description: My thoughts on security architecture after following Cisco's SDSI course.
date: 2026-07-30T10:12:35-04:00
image: 
tags:
    - HTB
categories:
    - htb-writeups
comments: false
---

## Introduction
Last month, Cisco released a course for Designing Cisco Security Infrastructure (SDSI) on Cisco U for free. My review of the course is that it is very useful for cybersecurity architects, but for security newcomers like I, it may not be too useful. However, I appreciate this course as it consolidates cybersecurity design decisions and concepts into a single source. Worth it~, I say. Here are some takeaways from the course.
1. Good security architecture boils down to 5 domains:
	1. Zero Trust Network Architecture (ZTNA)
	2. Security in Depth
	3. Data Security
	4. Security By Design
	5. Visibility and Monitoring
## Zero Trust Network Architecture (ZTNA)
1. The core concepts of ZTNA
	1. Assumed Breach: Assume that the perimeter has been breached. It encourages network administrators to plan in a way that makes lateral movement hard.
	2. Always verify: Identity becomes the security boundary. It makes sense as a computer may be used by multiple users, so the computer is not really a security identity.
	3. Least Privilege Access: We assign just enough privileges for certain periods of time to users and administrators to carry out their duties.
2. Implementation of ZTNA
	1. Implement Microsegmentation: VLAN (Layer 2), Virtual Routing and Forwarding (Layer 3), Zone based firewalls
	2. Implement strong authentication: Multi-factor authentication, Use an Identity Provider, strong passwords (But the trend is towards password-less)
	3. Implement Just In Time (JIT) and Just Enough Access (JEA) to limit privileges. Also perform regular access reviews
## Security in Depth
1. Security in Depth is the concept of having multiple layers of security, like Paradis in Attack on Titan (rofl).
2. Core defenses:
	1. Perimeter defenses: Firewalls, VPN, Secure Access Service Edge (SASE) etc
	2. Network defenses: Intrusion Detection Systems (IDS), Intrusion Prevention System (IPS), Network segmentation
	3. Endpoint defenses: Mobile Device Management (MDM), Endpoint Detection and Response (EDR)
	4. Application defenses: Web Application Firewalls, Email Security 
	5. Access defenses / Identity: Identity providers, Active Directory Domain Services
	6. Monitoring: SIEM
	7. Cloud defenses
	8. Security awareness (Because humans are the weakest link)
## Data Security
1. There are three focus areas in data security:
	1. Security of data in transit
	2. Security of data at rest
	3. Data loss prevention
2. Data in transit refers to data that is moving on the wire. The obvious way to protect them is via encrypted Virtual Private Networks (VPN).
3. There are 2 types of VPN
	1. Site to site VPN
		1. Usually used to connect two remote networks networks together
		2. Users are unaware that a VPN is use because encryption is performed by the router/firewall.
		3. Commonly IPSec
	2. Remote Access VPN
		1. Used to encrypt application traffic
		2. Commonly TLS
		3. Encryption is performed by the end device.
4. Data at rest refers to the data lying on the hard disk. If it unencrypted, people can just remove the hard disk and analyze its file contents.
	1. To counter this, use BitLocker for Windows (See [this](https://www.hexnode.com/blogs/yellowkey-bitlocker-bypass-and-the-risks-in-winre-recovery-paths/)) or dm-crypt for Linux
5. Data Loss Prevention is more towards preventing sensitive from data from being exfiltrated or modified by employees.
## Security By Design
1. This is related to application development. Basically, we want the app to be designed securely from the get-go.
	1. Another related term is "shift left" where we integrate security earlier in the software development lifecycle or the DevOps pipeline
2. I will use the DevOps pipeline as an example:
	1. Plan phase: Threat modelling can be performed to anticipate potential threat actors and vulnerabilities. This [book](https://www.amazon.com/Threat-Modeling-Designing-Adam-Shostack/dp/1118809998) was recommended.
	2. Code phase: 
		1. Integrate Static Application Security Testing (SAST) tools into the pipeline. It detects simple vulnerabilities like buffer overflow etc.
		2. Use a secrets vault. Don't hardcode credentials. (For Azure, there is this concept of managed identities for applications)
		3. Perform secrets scanning to ensure no secrets are pushed to the repo. Any red teamers worth their salt knows how to mine the entire git history for secrets.
	3. Build:
		1. If it is a container image, we can perform image scanning on the base image and the resultant image.
		2. Perform dependency scanning to ensure that dependencies are safe.
	4. Test:
		1. Perform Dynamic Application Security Testing (DAST). Test for logic bugs especially
	5. Release
	6. Deploy:
		1. Perform Infrastructure as Code scanning to ensure the deployment is done securely
	7. Operate:
		1. Enforce security such as allowed IPs, rate limits , SSL certificates at the load balancer
	8. Monitor:
		1. Integrates agents in each container that feeds back to a SIEM
		2. Store logs
## Visibility and Monitoring
1. Finally, we need to monitor to ensure that the security architecture is working as intended and identify security gaps.
2. We can refer to the SOC visibility triad:
	1. Security Incident and Event Management (SIEM)/ Logs: Used to aggregate and correlate data across different sources
	2. Network Detection and Response: Basically IDS and IPS. Monitors traffic in a network.
	3. Endpoint Detection and Response: Monitors activity on a device. We are concerned about the processes running on the endpoint or login attempts. A good way to bypass SSL encryption because nowadays most applications are using TLS, rendering network monitoring useless.
3. There is a new addition recommended by the creator of the triad - Application. He argues that the rise of vibe coded software necessitates the monitoring of applications because it is hard to deduce just from endpoint or network traffic data.
4. Example logs to collect:
	1. Logs from Endpoint: Processes, Login attempts
	2. Logs from Network Devices: PCAP captures
	3. Logs from Firewalls
	4. Logs from Applications: Database logs, application-specific logs
	5. Logs from Cloud/ Identity Provider
## Conclusion
1. This is just a pretty high-level overview of the course contents. It goes into much detail about security, such as how to secure an email server, BYOD management, compliance frameworks etc.
2. However, a good and basic security architecture will bring us far, I believe.
3. Heheh I realised this might be more relevant to my internship than expected.