import React from 'react';

const pageContent = {
  about: {
    label: 'About',
    title: 'A list app built around personal progress.',
    body: [
      'ListIt is for shared plans, recommendations, and collections where everyone should see the same list but keep their own completion state.',
      'Public lists can be discovered, liked, duplicated, and pinned. Private lists stay between owners and collaborators.'
    ]
  },
  help: {
    label: 'Help',
    title: 'How ListIt works.',
    body: [
      'Create a list, choose a category, then add the items you want to track. Invite collaborators by email and they will join only after accepting the invitation.',
      'Use Home for lists you own, collaborate on, pinned, or liked. Use Discover to browse public lists you have not interacted with yet.'
    ]
  },
  contact: {
    label: 'Contact',
    title: 'Get in touch.',
    body: [
      'For now, contact is handled by the project owner. Add your support email or contact form integration here when the app has a production support channel.',
      'If you are testing invitations, make sure the sender domain is verified in Resend and Firebase allows your production domain.'
    ]
  }
};

export default function InfoPage({ page = 'about' }) {
  const content = pageContent[page] || pageContent.about;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-220px)] max-w-4xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="surface rounded-[34px] p-6 sm:p-10">
        <div className="chip mb-5">{content.label}</div>
        <h1 className="text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
          {content.title}
        </h1>
        <div className="mt-6 space-y-4 text-base leading-8 text-slate-600">
          {content.body.map(paragraph => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
