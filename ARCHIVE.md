# Keeping the source documents

**95 MB in Backblaze B2, at `b2://danenberg-archive/irreplaceable/hailab/`.**
Two files: the Taylor scan and its OCR. Everything else the project reads —
the Koralus papers, `doc/`, `PyETR/` — is small enough to live in git and
does.

    tools/fetch_assets.py --check     verify what is on disk
    tools/fetch_assets.py            fetch anything missing or corrupt

## What these are

`Taylor Sources of the Self.pdf` is a scan of the book the whole moral-sources
side of this project rests on — the framework `README.md` describes and
`app/api/articulate/route.ts` prompts against. `taylor-ocr.pdf` is its OCR,
and the text `doc/taylor-sources-of-self-summary.md` was written from.

## Why both, when one is derived from the other

The OCR looks regenerable and is not, in the way that matters. No OCR recipe
was ever recorded — no script, no tool version, no page range — so
"re-derivable from the scan" is true in principle and useless in practice:
re-running *some* OCR would produce *an* OCR, not this one, and this is the
one the tracked summary was written against. AGENTS.md is explicit that
nothing should be left merely *regenerable in principle*, so it is archived
rather than trusted to a recipe that does not exist.

If a recipe is ever written down, `taylor-ocr.pdf` becomes a genuine artifact
and belongs in `danenberg-artifacts` instead, with a lifecycle rule. Until
then both files are originals.

## Why B2 and not git or LFS

These are a **copyrighted book**. That decides it before size does: this repo
is a Next.js app that could plausibly go public, and a scan of *Sources of the
Self* in its history would be there permanently and irreversibly. A private
bucket is the right home for a personal research copy; a git history is not.

Size agrees anyway. 95 MB of cold scans would be dragged down by every clone
of a 3.5 MB repo, for files nobody opens twice. LFS is the wrong shape for the
same reason it is in `roblox-avatar/ARCHIVE.md` — it is a working store, not a
backup, and the free tier is already spent on `shaylas-movies`.

The PDFs are gitignored so this cannot happen by accident.

## Verified, not assumed

Uploaded 2026-09-21 and checked at the far end rather than trusting the exit
code:

- `rclone check` against the bucket — **2 matching files, 0 differences**
  (a hash comparison, not a size comparison)
- sizes match byte-for-byte: 60,824,068 and 34,940,044
- a full round trip: `taylor-ocr.pdf` moved aside, refetched through
  `tools/fetch_assets.py`, `cmp`-identical to the original

## Object Lock

Both objects carry **governance retention until 2027-09-21**, inherited from
the bucket default rather than set by hand:

    b2 file info "b2://danenberg-archive/irreplaceable/hailab/taylor-ocr.pdf"
    # "fileRetention": {"mode": "governance", "retainUntilTimestamp": ...}

Reading that back needs `$B2_MASTER_KEY_ID` / `$B2_MASTER_APPLICATION_KEY`:
the two read-only keys in `rclone.conf` lack `readBucketRetentions` and report
`null` for every object, which has fooled several people into believing the
bucket unprotected. Governance rather than compliance is deliberate — the
master key can lift it with `--bypass-governance`, so no storage cost is ever
locked in permanently. Retention is renewable.
