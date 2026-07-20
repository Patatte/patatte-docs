# Contributing to Patatte documentation

Documentation is part of the product. A behaviour change is not complete until the relevant guide is reviewed.

## What belongs here

This public repository contains customer-safe product explanations, getting-started guides, troubleshooting and legal documents. Do not add credentials, internal incident detail, private repository links, unreleased commitments or security-sensitive architecture.

## Writing style

- Lead with the task or outcome.
- Use calm, direct language.
- Explain one workflow per section.
- Use the product's visible terms.
- Distinguish a confirmed behaviour from a deployment-specific option.
- Tell the reader what evidence to collect before escalation.
- Never advise repeated payment or order submission.

## Change workflow

1. Open or reference a documentation story.
2. Update the guide in the same workstream as the behaviour change.
3. Test every relative link in SUMMARY.md.
4. Ask the product owner and relevant engineering owner to review.
5. Merge through a pull request.
6. Record the review date on pages whose behaviour can drift.

## Pull-request checklist

- User-facing behaviour is accurate.
- No private or security-sensitive detail is exposed.
- Product names, roles and states use canonical terminology.
- Screenshots are redacted and current.
- Troubleshooting is safe and non-destructive.
- SUMMARY.md contains any new page.
- Internal architecture changes have a matching private ADR.
