# Security Policy

## Scope

KyberStation is a client-side web application. It does not run a backend server, does not collect user data, and does not transmit data to any remote service. All project data is stored locally in the browser via IndexedDB.

## Reporting a Vulnerability

If you discover a security issue (e.g., XSS in the generated code output, unsafe handling of imported config files, or a dependency vulnerability), please report it privately:

**Email:** koller.ken@gmail.com

Please include:
- Description of the vulnerability
- Steps to reproduce
- Affected component (engine, codegen, web app, etc.)

I'll acknowledge receipt within 48 hours and aim to provide a fix or response within 7 days.

## What Qualifies

- XSS or injection in the web UI
- Malicious code generation (generated C++ that could harm a Proffieboard)
- Unsafe deserialization of imported `.kyberstation-collection.json` files or Kyber Code URLs
- Dependency vulnerabilities with a realistic attack path

## What Doesn't Qualify

- Vulnerabilities in ProffieOS itself (report to the [ProffieOS project](https://github.com/profezzorn/ProffieOS))
- Theoretical attacks requiring physical access to the user's machine
- Issues in development dependencies not shipped to production
