# Legacy PHP prototype: ideas and behavior record

Date: 2026-10-21. The 2013-era PHP prototype was removed from the working tree in the commit that added this file. The last commit containing it is `7d0c296`; browse it at <https://github.com/alankelsey/rpg/tree/7d0c296>. The database account its connection files pointed at no longer exists, so no credential action is needed.

This file records everything the prototype said or tried to do, so the rewrite can decide what to bring forward. Nothing in it worked end to end (see [the modernization review](modernization-review.md), section 2), so "behavior" below means intent, not tested function.

## 1. Story text (verbatim, typos included)

**Scene I** (`scene1.php`, entry after name entry)

> You are standing on a curb in a small town (details)... you realize that you have a fresh start. There is $1500 in your pocket and all you own in a blue jansport backpack on your back.
>
> You look around and there is a convienent store, unemployement office, and a hotel. It is a name brand 4 star. Since you don't have anywhere to be or anyone to see, you decide to get a start on establising your self in this new town.
>
> Where do you want to start {name}?
> 1. convenient store → Scene II
> 2. hotel → Scene III
> 3. unemployment office → `scene4.php` (never written)

**Scene II** (`scene2.php`)

> You're hungry but all that seems to be around is this conveienent store. You walk in and scan the isles for something that cathes your eye. "Hmm, how a bout this Peanut M&M's?" You continue looking around, after all you've got no where to be. "Ohh or maybe this jerky?" "I better just get one for now..."
>
> Which one will it be?
> 1. M n Ms: Energy
> 2. Jerky: Health
>
> (Both options pointed back to Scene I.)

**Scene III** (`scene3.php`)

> You turn and walk towards the hotel. It appears to be a brand name 4 star. As you near the hotel you notice that directly accross the street is a hostel. It looks clean but not as upscale as he hotel.
>
> Where do you want to start?
> 1. Continue to hotel: 90$
> 2. Check out the hostel 45$
> 3. unemployment office
>
> (Wired to Scene I, Scene II, and Scene III respectively, which was a bug.)

**Alternate opening** (`caption.php`, never linked from the main flow)

> You wake up confused in a new world
> 1. decrease your health
> 2. increase your kindness
> 3. increase your strength

**Intro screen** (`intro.php`)

> Welcome to the text based choose your own adventure rpg (cyorpg). This is a test based Role playing game that follows the same format as those memorable choose you own adventure books
>
> Name: [ ] [begin]

**Footer line** (`footer.php`): "Play at your own risk, no promises made."

## 2. Ideas and intended functionality

Each item lists where it came from and a recommendation for the rewrite. "Bring forward" means it belongs in the first milestone; "later" means it fits a later stage of [plan.md section 11](plan.md#11-phasing-sketch-for-the-formal-plan).

| # | Idea | Source | Recommendation |
|---|---|---|---|
| 1 | **Player names their character before starting**, and the name is used in scene text ("Where do you want to start {name}?"). | `intro.php`, `scene1.php` | Bring forward. Name is part of run state and is rendered as text only (the old echo was an XSS sink). stat-lab already has a character name field. |
| 2 | **Persistent stats header**: name, level, health, strength, kindness always visible while reading. | `header.php`, `statstab.php` | Bring forward as an accessible stats panel. Decide per story which stats are visible; hidden meta stats stay hidden. |
| 3 | **Stats on a 0–100 scale**, shown as `N/100`. Level also out of 100. | `statstab.php`, `player.php` | Bring forward the bounded 0–100 scale for primary stats. Level is undecided: drop it, or derive it from progress. Note the prototype disagreed with itself (health started at 10 in `player.php` and 100 in commented setup code). |
| 4 | **Starting stats**: level 0, health 100, strength 0, kindness 0. | commented code in `scene1.php` | Use as a starting point for the new-town story, then balance through playtests. |
| 5 | **Money as a resource**: $1500 starting cash; $90 hotel vs $45 hostel. | `scene1.php`, `scene3.php` | Bring forward. This is the "one meaningful resource tradeoff" for milestone 1. |
| 6 | **Food choices with stat labels** (M&Ms → energy, jerky → health). This is the origin of the diet meta stat. | `scene2.php` | Bring forward as declarative effects plus a junk/good meal counter. Decide whether choice labels show their stat effect (the prototype did) or leave it to be discovered. |
| 7 | **Kindness as a stat**, so moral choices can be measured, not just survival. | `player.php`, `caption.php` | Bring forward. The new-town story needs at least one choice that moves kindness and one later check that reads it. |
| 8 | **Strength as a stat.** | `player.php` | Keep in the stat list; the starter story may not need it yet. |
| 9 | **Damage and payout events** ("hurt" lowers health by 1, "pay" gives money). | `choices.php`, `player.php` `decreaseHealth()` | Bring forward as effect types (`health: -1`, `money: +N`). Apply effects only when a choice is accepted, never on page render; the prototype applied damage during rendering, so a refresh hurt you again. |
| 10 | **Choice validation**: reject anything that isn't one of the offered choices. | `player.php` `choices()` | Bring forward as an engine rule: only legal choice IDs for the current scene are accepted. |
| 11 | **Free-text command input** ("Please Choose / Choice: [text]"), a parser-style alternative to clicking. | `command.php` | Later, optional. A typed shortcut (number keys, or typing the choice) is a cheap accessibility win; a real text parser is a different game and is not recommended for v1. |
| 12 | **Sessions and registration**: check for an existing session, return the user's ID, otherwise prompt to register. | `check_session.php` comment block | Later (plan stage 3). Milestone 1 uses local browser saves. The intent ("know who's playing and resume them") matches the new save requirement. |
| 13 | **User accounts table** `Users(userid, username, password)` in a MySQL database. | `player.php`, `test.php` | Do not carry forward. Use a managed auth provider when accounts arrive; never store passwords ourselves. |
| 14 | **Site pages around the game**: Home, About us, Contact us, News. | `index.php` menu, `pages/*.inc.php` | Later. A news or changelog page suits a game that adds stories over time. The landing page is the story list, not these pages. |
| 15 | **Scenes numbered and selected by number** (`scene<N>.php`). | `sceneselect.php`, `index.php` | Do not carry forward. Use stable scene and choice IDs in a story file. |
| 16 | **"Choose your own adventure book" framing** and roman-numeral scene titles (Scene I, II, III). | `intro.php`, scenes | Optional styling. Book-like chapter headings fit the reader and the stat-lab "book cover" art. |
| 17 | **Disclaimer tone**: "Play at your own risk, no promises made." | `footer.php` | Optional; fine as playful footer copy during the friends-only phase. |
| 18 | **Unfinished branch**: the unemployment office (scene 4). Job hunting was meant to be a main path. | `scene1.php` | Bring forward as a planned branch: finding work is the natural way to earn money back and reach endings. |

## 3. What was dropped with no loss

- MySQL connection helpers (`connect.php`, `db.php`, `c`), scratch scripts (`test.php`, `test2.php`), and placeholder page bodies ("here we are", "call here").
- `rpg.css` and `css/styles.css`: float layout, grey header and footer, fixed 800px caption width. The reader will be rebuilt responsive and accessible.
