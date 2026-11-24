# Spore Flight: privacy

Spore Flight keeps your progress (coins, levels, badges, settings) only on your phone, in the browser's storage.

## The online leaderboard (optional)

Nothing is sent anywhere unless you choose **JOIN** on the leaderboard screen. When you join, the game stores on
our leaderboard server:

- the name you chose for your mushroom,
- the country you picked (or none),
- your best endless score,
- a random player number that identifies your entry. Only your phone knows it; the boards show a one-way
  code made from it, never the number itself.

To check that a score is real, the game sends the recording of that run (its starting number, screen size and the
moments you tapped). The server replays it and keeps only the score; the recording is not stored.

Your internet address is used for one minute to stop floods of requests, and is not stored with your entry.
The country of your connection may be suggested when you join; it is not stored unless you pick it.

**Leaving:** tap LEAVE on the leaderboard screen to delete your entry from the server at once. Other players can
report an offensive name; a name reported several times is hidden.

The leaderboard runs on Vercel (hosting) and Upstash (database).
