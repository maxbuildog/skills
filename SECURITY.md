# Security policy

## Reporting a vulnerability

Email **security@storecanary.io** with the details. Please do not open a public issue for anything exploitable.

Expect an acknowledgement within 72 hours and a fix or a plan within 14 days. If you want credit in the changelog, say so and give me the name to use.

## Threat model

These skills run on your machine, with your agent's permissions, and they make HTTP requests to a hostname you supply. That is the whole attack surface, and it means two things:

**What you should expect from us.** No skill in this repo sends anything to a server we control. Requests go to the store being audited and to nothing else. Responses are treated as untrusted input: sizes are capped, parsers do not evaluate what they read, and nothing that comes back from a scanned site is executed.

**What you should watch for.** A skill hands its output to your agent, and your agent will act on it. Content fetched from a third-party website can contain text designed to steer an agent. Treat an audit report the same way you would treat any other untrusted web content: read it before letting an agent act on it.

## Scope

In scope: anything in this repository.

Out of scope: the StoreCanary hosted product (report that at the same address, it is just handled separately), and vulnerabilities in the agents that run these skills.
