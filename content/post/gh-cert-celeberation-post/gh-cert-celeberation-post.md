---
title: "Got my first GitHub Certification!"
description: Post about the 3 GitHub certs I got in June 2025
date: 2025-07-05T23:43:29Z
image:
tags:
    - GitHub
categories:
    - Certification
comments: false
---

![GH Cert Pathway](post/gh-cert-celeberation-post/GitHub_Certification_Pathway.png)

Last month, I completed 3 certifications from GitHub, namely Foundations, Actions and Advanced Security. It was not in my plan, but since I received 2 free vouchers and a 60% off voucher, I figured, why not lol. Let me give you a quick run down of what I learnt and some tips for the exam.

## What I learnt (The useful ones anyways)
1. GitHub Foundations
	1. Codespaces: Codespaces is a container allocated for a repository. You can edit your repository code, push commits, run and test the code etc. It is very useful if you want to test your code on the go. It uses the VS code interface.
	2. Web Editor: It is basically codespaces but you can only run and edit files, no code execution. It does not incur charges from GitHub. I usually use this nowadays. Shortcut to use the editor: change `https://github.com/trinuro/actions-learning-pathway` to `https://github.dev/trinuro/actions-learning-pathway`
	3. `.devcontainer/devcontainer.json`: This file is used to configure the environment of codespaces. For example, install Golang in the container
2. GitHub Actions
	1. Workflows: Workflow is the file to define automatic operations in a repository. You must define the events that trigger the workflow (eg a push commit) and the jobs that it will execute if said event is triggered. Use this for CI/CD.
	2. Custom GitHub Actions: You can define your own GitHub actions to be reused in multiple workflows. Just remember to define a `actions.yml` in the root directory.
	3. Reusable workflows: This is different from GitHub Actions in the sense that GH actions is used as a step in a job while reusable workflow is used as job
	4. GitHub Secret: Use this to store secrets for your workflows. Don't hardcode it.
3. GitHub Advanced Security:
	1. Code scanning: Identifies logical vulnerabilities in repository code, eg. SQL Injection
	2. Secret scanning: Identifies exposed secrets in repository code, issues, pull requests etc, eg API tokens
	3. Push protection: Identifies exposed secrets before it is committed
	4. Dependabot: Identifies vulnerable dependencies in the repo
	5. Dependabot Security Update: Automatically create pull request when vulnerable dependency is detected
## Tips for the exam
1. Go through the exam syllabus. Make sure you can answer each point in the syllabus
2. Do labs!
	1. Go through [GitHub Learning Pathways](https://resources.github.com/learn/pathways/) for initial exposure
	2. Go through [MS Learn on GitHub](https://learn.microsoft.com/en-us/training/github/) for labs
3. Try out the practice tests on [GHCertified](https://ghcertified.com/practice_tests/). It is not one-to-one with the exam questions but I think it is good enough. It shows you which documentation to read which is good. Read them all.

## Final Thoughts
Out of the three, I learnt/struggled the most from the GitHub Actions certification. However, I would definitely encourage the reader to go through the GitHub Actions cert before attempting GitHub Advanced Security (GHAS) as GHAS builds on the knowledge on GitHub Actions.

Good luck and happy learning. Cert collector out.