import React from 'react';

const helpSections = [
  {
    id: 'account',
    title: 'Getting Started',
    intro: 'You can browse public lists without signing in. Sign in when you want ListIt to remember your work.',
    points: [
      'Use Sign in with Google when you want to create lists, pin lists, like lists, or collaborate with other people.',
      'After signing in, you land on Home, where your own lists and saved lists live.',
      'If you sign out, you can still browse public lists from Discover.',
      'Your name is shown on lists you create and in collaborator lists so other people know who is involved.',
      'Click the ListIt logo or title any time you want to return to the landing page.'
    ]
  },
  {
    id: 'navigation',
    title: 'Finding Your Way Around',
    intro: 'ListIt separates your personal workspace from public discovery.',
    points: [
      'Home shows lists that matter to you: lists you own, lists you collaborate on, lists you pinned, and lists you liked.',
      'Discover is for browsing public lists from other people.',
      'When you are signed in, public lists you already liked, pinned, own, or collaborate on move out of Discover and into Home.',
      'The top navigation switches between Home and Discover.',
      'The footer gives you quick access to About, Help, and Contact.',
      'Invitation links take you directly to the invitation page, where you can accept access to a list.'
    ]
  },
  {
    id: 'create-lists',
    title: 'Creating Lists',
    intro: 'A list starts with a title, a category, and a public/private choice.',
    points: [
      'Click New List from Home.',
      'Enter a list title. The title is required.',
      'Choose an existing category or type a new category name if the right one does not exist yet.',
      'Leave category blank if you want the list to go under Other.',
      'Choose Public if you want other people to find the list in Discover.',
      'Choose Private if only you and invited collaborators should see it.',
      'After the list is created, ListIt asks if you want to add items right away.',
      'Add as many starting items as you want, or click Skip to create an empty list.',
      'Skipping does not add any default items.'
    ]
  },
  {
    id: 'edit-lists',
    title: 'Editing And Deleting Lists',
    intro: 'Edit mode keeps destructive controls out of the normal reading view.',
    points: [
      'Use the Edit button on a list when you want to change it.',
      'In edit mode, like and dislike controls are hidden and list editing controls are shown.',
      'You can add items from edit mode if you have permission.',
      'You can mark items for removal, then save the edit when you are ready.',
      'If you have full editing access, you can also change item text and item sub-categories.',
      'List owners can switch their list between public and private.',
      'The Delete button appears only in edit mode.',
      'Deleting a list removes the whole list, so ListIt keeps that action away from normal viewing.',
      'If you start editing and change your mind, use Cancel to leave without saving the draft changes.'
    ]
  },
  {
    id: 'items',
    title: 'Items And Personal Progress',
    intro: 'Everyone can share the same list while keeping their own completion state.',
    points: [
      'Add items when creating a list or later from edit mode.',
      'Every item needs text, such as a task, place, movie, book, or thing to buy.',
      'Sub-categories are optional labels inside a list, such as Urgent, Weekend, Restaurants, Flights, or Season 1.',
      'Check an item when you personally complete it.',
      'Your checkmark does not check the item for anyone else.',
      'Other collaborators can check the same item for themselves when they complete it.',
      'Use filters to focus on done items, unfinished items, items added by a person, or a specific sub-category.',
      'Use Sort to organize items by sub-category or alphabetically by name.'
    ]
  },
  {
    id: 'categories',
    title: 'Categories And Sub-Categories',
    intro: 'Categories organize lists. Sub-categories organize items inside a list.',
    points: [
      'Choose a category when creating a list so similar lists stay together.',
      'Examples of categories include Movies, Trips, Eateries, To Do, Books, and Hotels.',
      'If the category you need is missing, type a new category name while creating the list.',
      'Use sub-categories for smaller groups inside one list.',
      'Examples of sub-categories include Must Try, Budget, Work, Family, North Side, or High Priority.',
      'Typing a new sub-category while adding an item makes it available for that list category later.',
      'Sub-categories help with filtering, sorting, and scanning long lists.'
    ]
  },
  {
    id: 'collaborators',
    title: 'Adding Collaborators',
    intro: 'Collaborators join through email invitations rather than being added implicitly.',
    points: [
      'Open the Collaborators popup from a list you own or manage.',
      'Enter the collaborator email address.',
      'Choose what they should be allowed to do: Read Only, Edit, or Edit All.',
      'Click Add Invite to place the invite in the popup.',
      'Click Done when you are ready to actually send the invitation.',
      'The person is not added to the list just because you typed their email.',
      'They become a collaborator only after accepting the email invitation.',
      'After they accept, their name or email appears in the collaborator list.',
      'If they use a different email than the one invited, they need to sign in with the invited email to accept.'
    ]
  },
  {
    id: 'collaborator-changes',
    title: 'Managing Collaborators',
    intro: 'Collaborator management is staged so accidental clicks do not immediately change access.',
    points: [
      'Open Collaborators to see the owner, current collaborators, and pending invitations.',
      'Changing a permission in the dropdown does not save immediately.',
      'Removing someone marks their row as crossed out first.',
      'Canceling a pending invite marks that invitation as crossed out first.',
      'Use Undo if you change your mind before saving.',
      'Click Done to save everything currently shown in the popup.',
      'Click Cancel or close the popup to discard the unsaved collaborator changes.',
      'If you cancel an invitation, the invited person is notified by email when email delivery is available.',
      'If you remove a collaborator, they are notified by email when email delivery is available.'
    ]
  },
  {
    id: 'permissions',
    title: 'Permission Levels',
    intro: 'The permission dropdown follows a simple access ladder.',
    points: [
      'Read Only can view the list and track personal completion.',
      'Edit can do everything Read Only can do, plus add and remove items.',
      'Edit All can do everything Edit can do, plus manage item details and collaborators.',
      'Owners always have full access.',
      'Owners cannot be removed from the list.',
      'Owners and Edit All collaborators can invite people, cancel pending invitations, change permissions, and remove collaborators.',
      'Any collaborator can leave the list themselves, even if they only have Read Only access.',
      'Use Read Only for people who should follow the list without changing its contents.',
      'Use Edit for people who should help build the list.',
      'Use Edit All only for people you trust to manage the list and collaborators.'
    ]
  },
  {
    id: 'public-private',
    title: 'Public And Private Lists',
    intro: 'Visibility controls who can find and open a list.',
    points: [
      'Public lists can be seen by anyone in Discover.',
      'Private lists can be seen only by the owner and accepted collaborators.',
      'Owners can change public/private status in edit mode.',
      'Public lists can be liked, disliked, duplicated, and pinned by signed-in users.',
      'Private lists do not appear in public discovery.',
      'Use public lists for recommendations, travel ideas, watchlists, rankings, and reusable collections.',
      'Use private lists for personal planning, shared household lists, private trip planning, or anything not meant for discovery.',
      'Logged-out users can browse public lists but need to sign in for personal actions.'
    ]
  },
  {
    id: 'pinning',
    title: 'Pinning And Reordering',
    intro: 'Pinning keeps important lists easy to reach from Home.',
    points: [
      'Pin a visible list when you want it to stay easy to find.',
      'Pinned lists appear in Home.',
      'Unpinning removes the list from your pinned section but does not delete the list.',
      'Pinned order is saved for your account.',
      'Pinned cards have a small dotted corner handle.',
      'Drag pinned cards to reorder them.',
      'Pinning is personal: it affects your Home view, not everyone else’s.'
    ]
  },
  {
    id: 'likes',
    title: 'Likes, Dislikes, And Ranking',
    intro: 'Reactions help public lists surface in discovery while also saving liked lists to Home.',
    points: [
      'Like and dislike controls appear outside edit mode.',
      'Click Like to mark a public list as liked.',
      'Click Dislike to mark a public list as disliked.',
      'Click the active reaction again to clear it.',
      'Liked lists appear in your Home view.',
      'Disliked lists do not become part of your Home list set.',
      'Public lists use reactions to help decide which lists appear higher in discovery.',
      'Likes and dislikes are about the list itself, not your item completion.',
      'Your item progress stays separate even when you like or dislike a list.'
    ]
  },
  {
    id: 'duplicate',
    title: 'Duplicating Lists',
    intro: 'Duplicate creates your own private copy of a visible list.',
    points: [
      'Signed-in users can duplicate lists they can see.',
      'Owned lists, collaborated lists, pinned public lists, liked public lists, and discoverable public lists can be duplicated.',
      'The duplicate starts as private.',
      'The copied list keeps the original item text and sub-categories.',
      'The copied list has you as the owner.',
      'Your copied list has independent progress and collaborator settings.',
      'Use duplicate when you like someone else’s public list but want your own editable version.'
    ]
  },
  {
    id: 'notifications',
    title: 'Emails And Notifications',
    intro: 'ListIt uses email to keep collaborators informed about access changes.',
    points: [
      'Invitation emails are sent when you save staged invitations with Done.',
      'Invitation links open the accept page for the invited user.',
      'If you cancel a pending invitation, the invited person receives a cancellation email.',
      'If you remove a collaborator, they receive an email telling them they were removed.',
      'If an email does not arrive, ask the owner to confirm the address was typed correctly.',
      'People must accept an invitation before they appear as active collaborators.'
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Common Questions',
    intro: 'These are the most common things that can look confusing at first.',
    points: [
      'If a public list disappears from Discover after you like or pin it, check Home.',
      'If collaborator changes seem to disappear, they probably were not saved with Done.',
      'If a collaborator is not showing up, they may not have accepted the email invitation yet.',
      'If you cannot edit a list, you may have Read Only access.',
      'If you cannot manage collaborators, you need to be the owner or have Edit All access.',
      'If you cannot delete a list, it may contain items added by someone else or you may not be the owner.',
      'If an invitation was sent to the wrong email, cancel it and send a new one.'
    ]
  }
];

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

function HelpPage() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:px-8">
      <aside className="surface z-10 flex flex-col rounded-[28px] p-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)]">
        <div className="px-3 pb-3 pt-2">
          <div className="chip mb-3">Help</div>
          <h1 className="text-2xl font-semibold text-slate-950">ListIt guide</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Jump to a workflow or keep this guide open while scrolling.
          </p>
        </div>
        <nav className="soft-scrollbar flex max-h-[320px] flex-col gap-1 overflow-auto pr-1 sm:max-h-[380px] lg:max-h-[calc(100vh-17rem)]">
          {helpSections.map(section => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white/80 hover:text-slate-950"
            >
              {section.title}
            </a>
          ))}
        </nav>
      </aside>

      <section className="surface rounded-[34px] p-5 sm:p-8">
        <div className="max-w-3xl">
          <div className="chip mb-5">Help</div>
          <h2 className="text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            How to use ListIt.
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-600">
            A practical guide to creating lists, tracking your own progress,
            working with collaborators, and discovering public lists.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          {helpSections.map(section => (
            <article
              key={section.id}
              id={section.id}
              className="scroll-mt-28 rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-sm"
            >
              <h3 className="text-2xl font-semibold text-slate-950">{section.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
                {section.intro}
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600 sm:text-base">
                {section.points.map(point => (
                  <li key={point} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-slate-950" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function InfoPage({ page = 'about' }) {
  if (page === 'help') {
    return <HelpPage />;
  }

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
