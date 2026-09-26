'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

type EntityKind = 'Person' | 'Client' | 'Object';
type IntakeMedium = 'text' | 'photo' | 'document' | 'file' | 'agent';

interface LabIdRegistrationFormProps {
  initialValues?: {
    kind?: EntityKind;
    intakeMedium?: IntakeMedium;
    canonicalName?: string;
    aliases?: string;
    description?: string;
    sourceLabel?: string;
    sourceReference?: string;
    sourceSurface?: string;
  };
}

export function LabIdRegistrationForm({ initialValues }: LabIdRegistrationFormProps) {
  const initialKind = initialValues?.kind ?? 'Person';
  const initialIntakeMedium = initialValues?.intakeMedium ?? 'text';
  const initialCanonicalName = initialValues?.canonicalName ?? '';
  const initialAliases = initialValues?.aliases ?? '';
  const initialDescription = initialValues?.description ?? '';
  const initialSourceLabel = initialValues?.sourceLabel ?? '';
  const initialSourceReference = initialValues?.sourceReference ?? '';
  const initialSourceSurface = initialValues?.sourceSurface ?? 'lab-id-registration-form';

  const [kind, setKind] = useState<EntityKind>(initialKind);
  const [intakeMedium, setIntakeMedium] = useState<IntakeMedium>(initialIntakeMedium);
  const [canonicalName, setCanonicalName] = useState(initialCanonicalName);
  const [aliases, setAliases] = useState(initialAliases);
  const [description, setDescription] = useState(initialDescription);
  const [sourceLabel, setSourceLabel] = useState(initialSourceLabel);
  const [sourceReference, setSourceReference] = useState(initialSourceReference);
  const [error, setError] = useState<string | null>(null);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = canonicalName.trim().length > 1 && !isPending;

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30">Canonical register</p>
        <h3 className="mt-1 text-base font-black text-white">Register an entity now</h3>
        <p className="mt-1 text-xs leading-relaxed text-white/45">
          Use the agent for photos, screenshots, PDFs, and messy intake. Use this form when you already have structured fields and want to write canonical identity truth.
        </p>
        {initialSourceSurface !== 'lab-id-registration-form' && (
          <p className="mt-2 text-[11px] font-semibold text-emerald-200/80">
            Prefilled from agent intake. Review the provenance fields before writing canonical truth.
          </p>
        )}
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit) return;
          setError(null);
          setEntityId(null);

          startTransition(async () => {
            try {
              const response = await fetch('/api/entities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  kind,
                  canonicalName: canonicalName.trim(),
                  aliases: aliases
                    .split(',')
                    .map((value) => value.trim())
                    .filter(Boolean),
                  description: description.trim() || null,
                  registrationContext: {
                    medium: intakeMedium,
                    source_label: sourceLabel.trim() || null,
                    source_reference: sourceReference.trim() || null,
                    surface: initialSourceSurface,
                  },
                }),
              });

              const payload = (await response.json()) as { entityId?: string; error?: string };
              if (!response.ok || !payload.entityId) {
                throw new Error(payload.error ?? 'Entity registration failed.');
              }

              setEntityId(payload.entityId);
              setCanonicalName('');
              setAliases('');
              setDescription('');
              setIntakeMedium('text');
              setSourceLabel('');
              setSourceReference('');
              setKind('Person');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Entity registration failed.');
            }
          });
        }}
      >
        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Kind</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as EntityKind)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none"
          >
            <option value="Person">Person</option>
            <option value="Client">Client</option>
            <option value="Object">Object</option>
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Intake medium</span>
          <select
            value={intakeMedium}
            onChange={(event) => setIntakeMedium(event.target.value as IntakeMedium)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none"
          >
            <option value="text">Text</option>
            <option value="photo">Photo</option>
            <option value="document">Document / PDF</option>
            <option value="file">Other file</option>
            <option value="agent">Prepared by agent</option>
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Canonical name</span>
          <input
            value={canonicalName}
            onChange={(event) => setCanonicalName(event.target.value)}
            placeholder="Ana Souza, ACME Lisbon, LAB 512…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Aliases</span>
          <input
            value={aliases}
            onChange={(event) => setAliases(event.target.value)}
            placeholder="comma, separated, aliases"
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="What is this entity, why does it matter, and how should it be recognised?"
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Source label</span>
          <input
            value={sourceLabel}
            onChange={(event) => setSourceLabel(event.target.value)}
            placeholder="iPhone photo, passport scan, WhatsApp note, agent draft…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Source reference</span>
          <input
            value={sourceReference}
            onChange={(event) => setSourceReference(event.target.value)}
            placeholder="optional filename, note id, or external reference"
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition-opacity disabled:opacity-40"
          >
            {isPending ? 'Registering…' : 'Register entity'}
          </button>
          <Link
            href="/places/lab-id/agent?q=Help me prepare LAB ID intake from files or unstructured notes."
            className="text-xs font-semibold text-white/50 hover:text-white/75"
          >
            Need help from files first?
          </Link>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200/80">
          {error}
        </div>
      )}

      {entityId && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3">
          <p className="text-xs font-semibold text-emerald-200">Entity registered canonically.</p>
          <Link href={`/inspectors/entities/${entityId}`} className="mt-1 block text-sm text-white underline underline-offset-4">
            Open entity inspector
          </Link>
        </div>
      )}
    </div>
  );
}
