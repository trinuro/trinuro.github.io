---
title: "GitHub Actions Primer - Workflows for Continuous Integration"
description: 
date: 2025-07-12T23:21:25Z
image: 
tags:
    - GitHub
    - CI-CD
categories:
    - Personal-Research
comments: false
---

In this blog post, I would like to share a little about workflows on GitHub. In a nutshell, workflows allow you automate stuffs on GitHub, like continuous integration, continuous deployment, make bots that automatically comment on issues, make bots that automatically create pull requests from issues etc. This post contains a hands-on lab to follow along.
You can view the completed code in this [repository](https://github.com/trinuro/gha-ci-example)
## Set Up
1. Fork the repository
2. Clone the repository release v1.
```
git clone git@github.com:trinuro-organization/gha-ci-example-fork.git # change this
cd .\gha-ci-example-fork\ # change this

git remote add upstream https://github.com/trinuro/gha-ci-example
git fetch --tags upstream
git push --tags
git checkout v1
git switch -c myBranch
```
3. A quick test to see whether it works:
```
git branch
```
Desired Output:
```
  main
* myBranch
```
4. Inside the repository, you will see 3 important files:
	1. `example_module.py`: Just a simple python module
	2. `test_counting_sort.py` and `test_find_missing_number.py`: Tests cases for said module
.5 Navigate to the the github repository> Actions tab and enable Actions. ![Workflows arent enabled by default](p/github-actions-primer-workflows-for-continuous-integration/workflows-arent-enabled.png)

## Workflows
1. A workflow uses the YAML syntax
2. A workflow must have the following "root" keys
```yml
on:
	# identifies the events that trigger this workflow
jobs:
	# identifies the jobs to run
```
### Events that trigger workflows
1. There are many [events](https://docs.github.com/en/actions/reference/events-that-trigger-workflows) that can trigger workflows.
2. A few common ones:
	1. `push`: When a commit is pushed to GitHub
	2. `pull_request`: When a pull request is created (Before it is merged)
	3. `workflow_dispatch`: Manual trigger (Gives you a button to trigger said workflow)
	4. `repository_dispatch`: Trigger due to events outside the repo (Very interesting, this one)
3. To add an event trigger, add it under `on`
```yaml
on: push # works for single event trigger
on: [push, pull_request] # multiple events
# more granular event trigger
on:
	push:
		branches: [main]
	pull_request:
		branches: [main]
```
4. In our example, let's say we want to define 4 event triggers.
```yaml
on:
  push: 
    branches: ['main']
  pull_request: # trigger when pr is created to main branch
    branches: ['main']
  workflow_dispatch: # manual trigger
  repository_dispatch: # trigger via outside events

jobs:
	# identifies the jobs to run
```

### Jobs
1. We can define multiple jobs that run during a workflow
2. Each job is run inside its own independent container.
3. Each job can has multiple steps (that run in the same container)
4. Compulsory options in a job are 
	1. `runs-on`: Runs on a certain kind of container. There are 3 options on GitHub: 
		1. Ubuntu-latest
		2. MacOS-latest
		3. Windows-latest
	2. `steps`: Define the steps in an action
5. There are two "kinds" of steps. Different keyword is used for both of them.
	1. Steps that run GitHub Actions: `uses`
	2. Steps that run commands on the container: `run`
6. Let's define a job with one step: Greeting the user.
```yaml
# snip

jobs:
  test: # name of job (can be "job1" etc)
    runs-on: ubuntu-latest # use linux machine
    steps:
      - name: "Hello World" # not compulsory but aids in debugging
        # use run to execute commands in the container
        run: echo "Hello $GITHUB_ACTOR, happy learning!" 
```
Output: 
![Initial Workflow Debug](p/github-actions-primer-workflows-for-continuous-integration/debug-workflow.png)
7. That is cool, but let's clone our repository in the container so that we can examine the code inside. For this, we will use a pre-made action: [actions/checkout](https://github.com/actions/checkout)
```yaml
jobs:
  test:
    runs-on: ubuntu-latest 
    steps:
      - name: "Hello World"
        run: echo "Hello $GITHUB_ACTOR, happy learning!" 
      - name: "Import Repository" 
        # "uses" keyword allows us to use a github action
        uses: actions/checkout@v4
```
- Learnt the fact that the container does not contain the repo the hard way lol 
![Workflows failed!](p/github-actions-primer-workflows-for-continuous-integration/failed-workflows-no-checkout.png)
8. Next, we will execute the Python test code
```yaml
jobs:
  test:
    runs-on: ubuntu-latest 
    steps:
      - name: "Hello World"
        run: echo "Hello $GITHUB_ACTOR, happy learning!" 
      - name: "Import Repository" 
        uses: actions/checkout@v4
      - name: "Run Unit Test"
        # we can run multiline commands like this
        run: python -m unittest       
```
9. Just for fun, this is how you run a multiline step
```yaml
jobs:
  test:
    runs-on: ubuntu-latest 
    steps:
      - name: "Hello World"
        run: echo "Hello $GITHUB_ACTOR, happy learning!" 
      - name: "Import Repository" 
        uses: actions/checkout@v4
      - name: "Run Unit Test"
        # we can run multiline commands like this
        run: |
		  ls -la
	      python -m unittest
```
Output:
![CI Workflow Success](p/github-actions-primer-workflows-for-continuous-integration/ci-success.png)
## Other Workflow Triggers
1. There are two unique workflow triggers that we defined, workflow dispatch and repository dispatch. Let's see how to trigger them.
2. To trigger `workflow_dispatch`, navigate to your GitHub Repo > Actions Tab > Click "Python Test" on the left sidebar. Click on "Run workflow" to trigger the workflow.
	![](p/github-actions-primer-workflows-for-continuous-integration/GitHub%20workflow_dispatch.png)
3. To trigger `repository_dispatch`, you need to send a post request to a github endpoint. 
	1. First, create a fine-tuned access token. Go to account settings> Developer Settings > PAT > Fine-grained tokens and press Generate New Token 
		![](p/github-actions-primer-workflows-for-continuous-integration/create-personal-token-1.png)
		![](p/github-actions-primer-workflows-for-continuous-integration/create-personal-token-2.png)
	2.  The fine-grained token must have the following permission set:
		- "Contents" repository permissions (read and write)
	3. Send a HTTP request to the relevant endpoint. 
```sh
curl -L \
-X POST \
-H "Accept: application/vnd.github+json" \
-H "Authorization: Bearer github_pat_..<snip>.." \
-H "X-GitHub-Api-Version: 2022-11-28" \
https://api.github.com/repos/<accName>/<repo-name>/dispatches \
-d '{"event_type":"my_input","client_payload":{}'
```
Output: 
![](p/github-actions-primer-workflows-for-continuous-integration/GH_Repo_Dispatch.png)
- "Repository dispatch triggered"

## Conclusion
1. This is a very simple example of a continuous integration workflow using GitHub.
2. Automated workflows are quite powerful as it frees developers from mundane testing tasks and in terms of security, encourage a shift left in security.
3. Further reading:
	1. GitHub Workflow Syntax: https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions