# Contributing to Patatte documentation

Documentation is part of the product. A customer-visible behaviour change is not complete until the relevant guide is reviewed.

## Public-content boundary

This repository contains customer-safe product explanations, task guides, troubleshooting and approved legal material. Do not add credentials, private repository links, internal incident detail, deployment procedures, security-sensitive architecture, customer-specific commercial terms or unreleased commitments.

## Required workflow

1. Link the change to a product or documentation issue.
2. Update the relevant guide with the behaviour change.
3. Update `SUMMARY.md` when navigation changes.
4. Run documentation validation and inspect links.
5. Request product and relevant engineering review.
6. Merge through a pull request.

## Maintenance cadence

- Triage support learnings into task or troubleshooting guides weekly.
- Review affected documentation in the same PR as a behaviour change.
- Review all public pages quarterly.
- Remove or clearly mark content that no longer reflects the product.

## Pull-request checklist

- The page has one audience and task.
- Product names, roles and states use current terminology.
- Deployment-specific behaviour is identified as such.
- Screenshots and examples contain no private customer data.
- Troubleshooting is safe and does not encourage duplicate payment or submission.
- Internal architecture and operational procedures remain private.
