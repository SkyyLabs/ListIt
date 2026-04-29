import React from 'react';
import { motion } from 'framer-motion';
import { APP_NAME } from '../config/constants';

const featureCards = [
  {
    title: 'Shared list, private progress',
    body: 'Everyone sees the same items, but each person keeps their own completion state.'
  },
  {
    title: 'Permissioned collaboration',
    body: 'Invite people to read, add and remove, or fully manage list details without handing over ownership.'
  },
  {
    title: 'Pinned and ranked',
    body: 'Keep your important lists pinned, while public lists compete through likes, dislikes, and activity-based ranking.'
  }
];

const workflowSteps = [
  'Create a list and attach it to a category.',
  'Add collaborators and give them the right level of control.',
  'Track your own progress without altering anyone else’s view.'
];

export default function LandingPage({ onLogin }) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_32%),radial-gradient(circle_at_80%_20%,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_48%,_#f8fafc_100%)]" />

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-10 sm:px-8 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1 text-sm text-slate-600 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Collaborative lists without shared checkmarks
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                {APP_NAME} keeps the list social and the progress personal.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                Build public or private lists, invite collaborators, pin what matters,
                and let every user move through the same collection at their own pace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={onLogin}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Start with Google
              </button>
              <div className="text-sm text-slate-500">
                Google sign-in, shared lists, per-user progress
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {featureCards.map((card, index) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * (index + 1), duration: 0.45 }}
                  className="rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.32)] backdrop-blur"
                >
                  <h2 className="mb-2 text-base font-semibold text-slate-900">
                    {card.title}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">{card.body}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="relative"
          >
            <div className="absolute -left-6 top-6 hidden h-28 w-28 rounded-full bg-amber-200/70 blur-2xl lg:block" />
            <div className="absolute -right-5 bottom-2 hidden h-24 w-24 rounded-full bg-sky-200/70 blur-2xl lg:block" />

            <div className="relative rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-[0_35px_100px_-45px_rgba(30,41,59,0.55)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Live board
                  </div>
                  <div className="text-lg font-semibold text-slate-900">
                    Trips / Summer shortlist
                  </div>
                </div>
                <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  Public
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl bg-amber-100 p-4">
                  <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
                    <span>Shared items</span>
                    <span>Subcategory sort</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-5 w-5 rounded border border-slate-300 bg-white" />
                      <div className="flex-1">
                        <div className="text-base text-slate-900">Book Kyoto stay</div>
                        <div className="text-xs italic text-slate-500">Hotels</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-5 w-5 rounded border border-emerald-500 bg-emerald-500/90" />
                      <div className="flex-1">
                        <div className="text-base text-slate-900">Save ramen spots</div>
                        <div className="text-xs italic text-slate-500">Eateries</div>
                      </div>
                      <div className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-500">
                        done by you
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-5 w-5 rounded border border-slate-300 bg-white" />
                      <div className="flex-1">
                        <div className="text-base text-slate-900">Find quiet day trip</div>
                        <div className="text-xs italic text-slate-500">Trips</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-sky-50 p-4">
                    <div className="mb-2 text-sm font-medium text-slate-800">Collaborator rights</div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">READ</span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">ADD_REMOVE</span>
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white shadow-sm">EDIT_ALL</span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <div className="mb-2 text-sm font-medium text-slate-800">Public ranking</div>
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Likes 42 / Dislikes 3</span>
                      <span className="font-semibold text-slate-900">Score +17</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-8 lg:px-10">
        <div className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white/80 p-8 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.4)] backdrop-blur lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <div className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
              How it works
            </div>
            <h2 className="text-3xl font-semibold text-slate-900">
              Built for lists that outgrow one person.
            </h2>
            <p className="max-w-lg text-base leading-7 text-slate-600">
              The app already supports private and public lists, item permissions,
              pins, collaborator roles, and weighted reactions for discovery.
            </p>
          </div>

          <div className="grid gap-4">
            {workflowSteps.map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50/85 p-4"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="pt-1 text-base leading-7 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
