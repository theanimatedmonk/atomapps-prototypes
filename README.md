# App prototypes

Clickable Android prototypes in plain HTML, CSS and JavaScript (no build step). Use the **Prototypes** button at the bottom-left to switch between them. The site opens on the news app.

## Clock app: wake-up challenges

Open `clock/index.html` in a browser. The sidebar jumps to starting points for each part of the flow:

- **Math, Retype, Steps, Shake, Scan code**: setup, test mode, edit alarm with the challenge set, and the ringing alarm
- **Permissions**: toggle between the first-run state (nothing granted) and everything allowed; preview each system dialog
- **Intro hook**: the once-a-day card animation shown until a challenge is first set up, with its rules

Steps and Shake use the phone's motion sensor; on desktop, hold the dashed "simulate" button or press Space. Scan code uses the camera where available, with simulate buttons as a fallback. State is saved in your browser; use "Reset prototype" in the sidebar to start over.

## News app: first-run coachmarks

Open `news/index.html`. First-time visitors get a four-step tour over the feed and menu screens: swipe up for more news, tap Menu, choose a topic, then "You are all set!". Tap anywhere to move to the next step. "Replay coachmarks" (bottom-right) runs it again.
