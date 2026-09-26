export type MinilabConceptId =
  | 'place'
  | 'app'
  | 'session'
  | 'run'
  | 'terminal'
  | 'job'
  | 'workflow';

export type MinilabConcept = {
  id: MinilabConceptId;
  title: string;
  definition: string;
  not: string;
};

export const MINILAB_ONTOLOGY: MinilabConcept[] = [
  {
    id: 'place',
    title: 'Place',
    definition: 'A top-level operational location in minilab.work, such as LAB 512, LAB ID, Apps, or Workflows.',
    not: 'Not an app session and not a workflow run.',
  },
  {
    id: 'app',
    title: 'App',
    definition: 'A concrete executable surface opened from Apps, such as Coding Agents or Terminal Console.',
    not: 'Not a place and not a workflow.',
  },
  {
    id: 'session',
    title: 'Session',
    definition: 'A live instance of an app or agent conversation that preserves context over time.',
    not: 'Not the same thing as a job record.',
  },
  {
    id: 'run',
    title: 'Run',
    definition: 'A bounded execution attempt started from a session, often producing output, actions, or a terminal attachment.',
    not: 'Not the whole app.',
  },
  {
    id: 'terminal',
    title: 'Terminal',
    definition: 'An attached execution surface exposed by a run when live command access exists.',
    not: 'Not every session has one.',
  },
  {
    id: 'job',
    title: 'Job',
    definition: 'A governed truth object in the core that can be proposed, admitted, run, and inspected.',
    not: 'Not the same as a conversational session.',
  },
  {
    id: 'workflow',
    title: 'Workflow',
    definition: 'An orchestration layer that coordinates runs, retries, approvals, and handoffs between places and apps.',
    not: 'Not the launch surface for Coding Agents.',
  },
];

export function ontologyRows(ids: MinilabConceptId[]) {
  return ids.map((id) => {
    const concept = MINILAB_ONTOLOGY.find((entry) => entry.id === id)!;
    return {
      label: concept.title,
      value: concept.definition,
      note: concept.not,
    };
  });
}
