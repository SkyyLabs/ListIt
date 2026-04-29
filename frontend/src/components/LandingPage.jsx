import React from 'react';
import { motion } from 'framer-motion';
import { APP_NAME } from '../config/constants';

const featureCards = [
  ['Personal progress', 'A shared list can be finished differently by every collaborator.'],
  ['Permissioned editing', 'Give people read, add/remove, or full edit access without handing over ownership.'],
  ['Discovery signal', 'Public lists can be liked, disliked, ranked, duplicated, and pinned.']
];

const boardItems = [
  ['Book Kyoto stay', 'Hotels', false],
  ['Save ramen spots', 'Eateries', true],
  ['Find quiet day trip', 'Trips', false],
  ['Compare rail passes', 'Planning', true]
];

export default function LandingPage({ onDiscover, onLogin }) {
  return (
    <div className="overflow-hidden">
      <section className="relative mx-auto grid min-h-[calc(100vh-72px)] max-w-7xl gap-10 px-4 pb-10 pt-8 sm:px-6 lg:grid-cols-[0.96fr_1.04fr] lg:items-center lg:px-8">
        <div className="absolute inset-x-4 bottom-0 top-8 -z-10 rounded-[42px] border border-white/70 bg-white/45 shadow-[0_30px_100px_-70px_rgba(15,23,42,0.85)] backdrop-blur sm:inset-x-6 lg:inset-x-8" />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="px-2 py-8 sm:px-6 lg:py-16"
        >
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Lists stay shared. Checkmarks stay yours.
          </div>

          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-normal text-slate-950 sm:text-6xl lg:text-7xl">
            {APP_NAME} makes shared lists feel personal.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
            Build a public library of ideas or a private planning board, invite the
            right people, and let everyone move through the same list at their own pace.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button onClick={onLogin} className="primary-button px-6 py-3">
              Start with Google
            </button>
            <button onClick={onDiscover} className="secondary-button px-6 py-3">
              Explore public lists
            </button>
            <div className="chip">Firebase auth</div>
            <div className="chip">Mongo-backed progress</div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {featureCards.map(([title, body]) => (
              <div key={title} className="surface rounded-[24px] p-4">
                <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="px-2 pb-8 sm:px-6 lg:py-14"
        >
          <div className="relative mx-auto max-w-2xl">
            <div className="surface overflow-hidden rounded-[34px]">
              <div className="border-b border-slate-200/80 bg-slate-950 px-5 py-5 text-white sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase text-emerald-300">
                      Live board
                    </div>
                    <div className="mt-1 text-2xl font-semibold">Trips / Summer shortlist</div>
                  </div>
                  <div className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-emerald-950">
                    Public
                  </div>
                </div>
              </div>

              <div className="grid gap-4 bg-[#f8faf7] p-4 sm:grid-cols-[1fr_0.72fr] sm:p-6">
                <div className="rounded-[26px] bg-[#fff2bd] p-4 shadow-inner">
                  <div className="mb-4 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Shared items</span>
                    <span>Sorted by subcategory</span>
                  </div>
                  <div className="space-y-3">
                    {boardItems.map(([text, category, done]) => (
                      <div key={text} className="flex items-start gap-3 rounded-2xl bg-white/62 p-3">
                        <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border ${done ? 'border-emerald-600 bg-emerald-500' : 'border-slate-300 bg-white'}`}>
                          {done && <span className="h-2 w-2 rounded-full bg-white" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-semibold ${done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                            {text}
                          </div>
                          <div className="mt-1 text-xs italic text-slate-500">{category}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[26px] bg-white p-4 shadow-sm">
                    <div className="mb-3 text-sm font-semibold text-slate-950">Collaborators</div>
                    <div className="space-y-2">
                      {['Owner', 'READ', 'ADD_REMOVE', 'EDIT_ALL'].map((label, index) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className={`h-8 w-8 rounded-full ${index === 0 ? 'bg-slate-950' : 'bg-slate-200'}`} />
                          <span className="text-xs font-semibold text-slate-600">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[26px] bg-[#d7f4e3] p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-950">Public ranking</div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-white/75 p-3">
                        <div className="text-2xl font-semibold text-slate-950">42</div>
                        <div className="text-xs font-semibold text-slate-500">Likes</div>
                      </div>
                      <div className="rounded-2xl bg-white/75 p-3">
                        <div className="text-2xl font-semibold text-slate-950">+17</div>
                        <div className="text-xs font-semibold text-slate-500">Score</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[26px] bg-[#dbeafe] p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-950">Pinned order</div>
                    <div className="mt-3 flex gap-2">
                      <span className="h-3 flex-1 rounded-full bg-slate-950" />
                      <span className="h-3 flex-[0.75] rounded-full bg-slate-400" />
                      <span className="h-3 flex-[0.45] rounded-full bg-slate-300" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            ['Create', 'Make a category-backed public or private list.'],
            ['Invite', 'Set exact collaborator permissions for the job.'],
            ['Track', 'Complete items without changing anyone else’s progress.']
          ].map(([title, body], index) => (
            <div key={title} className="surface rounded-[28px] p-6">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                {index + 1}
              </div>
              <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
