# RFC-NNN — [Topic]

> **Status** · Draft v0.1 · [date]
> **TA anchor** · §components/[…] · §contracts/[…] · §constraints (which ones apply)
> **Related** · PRDs, RFCs, ADRs this RFC depends on or affects
> **Closes into** · ADR-NNN (pending)
> **Why this is an RFC** · [One sentence: what genuinely open question is being argued. If the answer is mostly known going in, this is an ADR being written in the wrong shape — close the file and start over as an ADR.]

---

## The question

[2–3 paragraphs framing the open question. What is the technical decision that has to be made? Why is it open — what makes it not obvious? What constraints from TA bound the answer?]

## Use cases

[When does this matter, and to whom? Concrete scenarios where the answer to this question changes the system's behaviour. If you can't name at least two scenarios, the question may not be real.]

1. **[Scenario]** — [description]
2. **[Scenario]** — [description]

## Goals

[What does the answer need to achieve? Bullet-form, technical objectives. Each goal should be specific enough to evaluate alternatives against.]

- [Goal 1]
- [Goal 2]
- [Goal 3]

## Constraints

[From TA §constraints. What cannot change. Any answer must honour these.]

- [Constraint 1, with TA reference]
- [Constraint 2, with TA reference]

## Proposed approach

[The recommended path with enough detail to be evaluable. Code sketches, schemas, sequence descriptions — whatever makes the proposal concrete. This is *the* proposal, not a menu of options.]

```
[example schema, pseudocode, or flow]
```

## Alternatives considered

[Other approaches that were considered and rejected, with the actual reasoning. Not "Option A" / "Option B" with feature lists — the genuine reason each was set aside. If an alternative was never seriously considered, don't list it.]

### Alternative: [name]

[Description. Why considered. Why rejected.]

### Alternative: [name]

[Description. Why considered. Why rejected.]

## Trade-offs

[What the proposed approach costs. Every real proposal trades something away. Name what.]

- [Trade-off 1]
- [Trade-off 2]

## Open questions

[Sub-questions still to resolve before this RFC can close. If empty, the RFC is ready to convert to ADR(s).]

1. [Question]
2. [Question]

## How this closes

[Which ADRs come out of this decision. One RFC may close into one ADR or several — name them.]

- **ADR-NNN** — [title of the ADR that locks the proposed approach]
- **ADR-NNN** — [if a sub-decision needs its own ADR]

## Links

- **Source** — relevant OC-04 section
- **TA** — §components/[…] · §contracts/[…] · §constraints
- **Related PRDs** — [if this RFC was triggered by a PRD's open thread]

---

## Notes on writing RFCs in this format

**The bar.** RFC = exploration. If the answer is mostly known going in, write an ADR instead. If the work is "set up the thing," it's neither RFC nor ADR — it's a config file. The "Why this is an RFC" sentence in the header is the test: if it's hard to write, the file should not be an RFC.

**Honest alternatives.** The Alternatives Considered section is what separates a true RFC from a task list. List only alternatives that were genuinely considered. For each, write the *real* reason for rejection — not a strawman. Future readers (including yourself) need to trust that the deliberation was real.

**Closes into ADRs.** Every RFC ends by becoming one or more ADRs. Name them in the "How this closes" section. If you can't name what ADR(s) come out of this RFC, the deliberation isn't sharp enough yet.

**Voice.** RFCs are technical but not robotic. The OceanCanvas voice — present-tense, declarative, slightly editorial — applies here too. Less prose than a PRD, but no SaaS-speak, no apologetic preamble.

**Length.** Two to four pages. Long enough to make the proposal real; short enough to be reviewable.
