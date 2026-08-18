# Word Streak Master

MASTER META PROMPT

AI VOCABULARY STREAK APPLICATION

ROLE

Act as a senior product engineer, full-stack developer, AI engineer, UX/UI designer, database architect, and QA engineer.

Build a complete, polished, standalone web application called:

AI Vocabulary Streak

This is an independent product built from scratch.

Do not assume or depend on any existing application, project, database, authentication system, API, or codebase.

The product's purpose is to help users improve their English vocabulary and communication skills through a structured daily challenge powered by AI.

1. PRODUCT VISION

The core idea is:

Learn one new word every day, prove that you understand it, use it in writing, speak it aloud, recall related words, and build a daily streak.

The application should NOT behave like a normal dictionary or chatbot.

The user must actively participate.

The daily learning cycle is:

LEARN → WRITE → SPEAK → RECALL → SCORE → STREAK

The user earns the daily streak only after successfully completing the required activities.

2. CORE DAILY WORKFLOW

Every daily challenge should follow this sequence:

Step 1

User enters a new vocabulary word.

Step 2

AI explains the word.

Step 3

User writes 3 original sentences using the word.

Step 4

AI evaluates the sentences.

Step 5

User speaks using the word.

Step 6

AI analyzes the speech.

Step 7

User provides one synonym and one antonym.

Step 8

AI validates the answers.

Step 9

Calculate the daily score.

Step 10

If all required stages are completed:

🔥 Increase the streak by 1

3. TARGET USER

The application is designed for anyone who wants to improve:

English vocabulary

Grammar

Sentence construction

Pronunciation

Speaking confidence

Word recall

Everyday communication

Do not restrict the application to a specific organization, profession, college, or training program.

4. APPLICATION PAGES

Create the following pages:

Landing Page

Sign Up

Login

Dashboard

Daily Vocabulary Challenge

Word Details

Writing Challenge

Speaking Challenge

Synonym & Antonym Challenge

Daily Result

Vocabulary History

Revision

Achievements

Progress Analytics

Profile

Settings

5. LANDING PAGE

Create a modern landing page.

Main headline:

One Word a Day. Build Better Communication.

Supporting text:

Learn it. Write it. Speak it. Remember it.

Explain the four main steps:

01 — Learn

Understand a new word with AI.

02 — Write

Create 3 original sentences.

03 — Speak

Use the word in your own spoken sentence.

04 — Recall

Give a synonym and antonym.

Then explain:

Complete the challenge → Earn your streak 🔥

Primary button:

Start Your Streak

Secondary button:

See How It Works

6. USER AUTHENTICATION

Implement standalone authentication.

Sign Up

Fields:

Full name

Email

Password

Confirm password

Login

Email

Password

Implement secure password hashing.

Protect authenticated pages.

A user must only be able to access their own data.

Never expose passwords or secrets.

7. DASHBOARD

The dashboard should immediately show the user's daily status.

Display:

Current Streak

🔥 12 Days

Longest Streak

🔥 21 Days

Words Learned

24

Words Mastered

18

Today's Progress

3 / 4

Today's Word

Meticulous

Today's Score

91%

Also show:

Weekly activity

Recent words

Average score

Recent achievements

Revision words

The most prominent CTA should be:

Continue Today's Challenge

or:

Start Today's Challenge

depending on completion status.

8. DAILY CHALLENGE INTERFACE

Create a step-by-step interface.

At the top show:

Today's Vocabulary Challenge

Progress:

1 Learn → 2 Write → 3 Speak → 4 Recall → 5 Complete

Clearly highlight the current step.

The user should always know:

What stage they are on

What they need to do

How much remains

Use a clean progress bar or stepper.

9. STEP 1 — ENTER A WORD

Display:

What new word did you learn today?

Input:

Enter a vocabulary word

Button:

Analyze Word

Example:

Meticulous

Validate:

Empty input

Invalid input

Spelling

Whether the word appears to be an English word

Recently repeated words

If invalid:

"We couldn't recognize that as a valid English word. Try another word."

If the word was recently practiced:

"You've practiced this word recently. Try a different word."

Do not unnecessarily reject words that were learned long ago.

10. AI WORD ANALYSIS

Once a valid word is submitted, AI should generate a structured learning card.

Display:

Word

METICULOUS

Pronunciation

meh-TIK-yuh-lus

Part of Speech

Adjective

Simple Meaning

Very careful and paying close attention to details.

Detailed Meaning

Provide a slightly more detailed explanation.

Word Breakdown

If linguistically reliable:

Prefix:
...

Root:
...

Suffix:
...

If no reliable morphological breakdown exists:

"This word does not have a reliable prefix/root/suffix breakdown."

IMPORTANT:

Never invent a prefix, root, or suffix simply to fill the UI.

Example Sentence

Provide one natural example.

Synonyms

Provide several useful synonyms.

Antonyms

Provide several useful antonyms.

Difficulty

Beginner / Intermediate / Advanced

11. WORD LEARNING FEATURES

Allow the user to:

Listen to pronunciation

Read the meaning

View examples

View synonyms

View antonyms

View word breakdown

Add a:

🔊 Listen

button.

Use browser text-to-speech or an appropriate speech service.

Do not require the user to memorize the AI's example sentence.

12. LEARNING CONFIRMATION

After reviewing the word:

Display:

Ready to use this word?

Button:

Start Writing Challenge

Do not mark the daily challenge as complete at this stage.

13. STEP 2 — WRITE THREE SENTENCES

The user must write exactly 3 original sentences.

Display:

Sentence 1

Input field

Sentence 2

Input field

Sentence 3

Input field

Instruction:

Use today's word naturally in all three sentences.

Requirements:

All 3 must contain the target word.

They should be grammatically meaningful.

They should be different from one another.

They should not simply copy the AI example.

14. ANTI-COPY MECHANISM

Implement reasonable anti-copy behavior.

Important:

Do NOT claim that browser-based controls can guarantee 100% prevention of copying.

Implement:

Disable paste inside answer fields.

Disable drag-and-drop text.

Track typing duration.

Track typing activity.

Detect extremely fast submissions.

Detect identical sentences.

Detect highly similar sentences.

Detect direct reproduction of the AI example sentence.

If suspicious behavior occurs, do not immediately accuse the user.

Instead ask for a simple confirmation such as:

"Explain what your sentence means in your own words."

The purpose is to encourage genuine learning.

15. SENTENCE EVALUATION

Send each sentence to an AI evaluation service.

Evaluate:

Vocabulary Usage

30%

Grammar

25%

Context

20%

Sentence Structure

15%

Naturalness

10%

Return:

Individual sentence score

Overall writing score

Pass/fail

Feedback

Detected errors

Example:

Sentence 1
92% — Excellent

Sentence 2
76% — Needs improvement

Sentence 3
94% — Excellent

Overall:

87%

16. AI FEEDBACK RULES

Feedback should teach rather than simply say "wrong."

Bad:

❌ Wrong sentence.

Good:

⚠️ The target word is being used correctly, but the sentence has a grammar issue with the verb tense.

Then:

Try writing it again.

Do not automatically insert the corrected sentence into the answer field.

The user must correct it themselves.

17. WRITING PASSING RULE

Default passing score:

80%

Make this configurable in the application.

The writing stage is completed only when all 3 sentences satisfy the required criteria.

If not:

Try Again

Allow unlimited reasonable retries during the same day.

Retries should not reduce the user's streak.

18. STEP 3 — SPEAKING CHALLENGE

After writing is successfully completed:

Display:

Speak Using Today's Word

Instruction:

Create your own sentence using today's word and say it aloud.

Do not force the user to repeat the AI's example sentence.

Provide:

🎙 Start Recording

Then:

⏹ Stop Recording

Then:

Analyze My Speech

19. SPEECH PIPELINE

Implement:

Microphone
↓
Audio Recording
↓
Speech-to-Text
↓
Transcript
↓
Target Word Detection
↓
Grammar Evaluation
↓
Pronunciation Analysis
↓
Speaking Score

Display the transcript to the user.

Example:

Your Speech

"I was meticulous while preparing the report."

Target Word

✓ Detected

20. SPEAKING EVALUATION

Evaluate:

Target Word Detection

Did the user actually say the target word?

Pronunciation

Estimate pronunciation accuracy where technically supported.

Grammar

Evaluate the spoken sentence.

Vocabulary Usage

Check whether the target word was used correctly.

Fluency

Where technically possible, consider:

Long pauses

Hesitation

Speech continuity

Do not present unreliable measurements as scientific facts.

If pronunciation is estimated, label it clearly:

Estimated Pronunciation Score

21. SPEAKING RESULT

Example:

Target Word
✓ Detected

Pronunciation
88%

Grammar
93%

Vocabulary Usage
95%

Fluency
84%

Overall Speaking Score
90%

Feedback:

"Good use of the word. Your pronunciation is clear; try reducing pauses between phrases."

22. SPEECH SERVICE ARCHITECTURE

Create a modular service:

SpeechAnalysisService

Include functions such as:

transcribeAudio()

detectTargetWord()

evaluatePronunciation()

evaluateGrammar()

evaluateFluency()

calculateSpeakingScore()

The speech provider should be replaceable.

Never expose speech API keys in frontend code.

23. STEP 4 — SYNONYM + ANTONYM

After speaking:

Display:

Quick Recall

Do not show the word's synonym and antonym list prominently at this stage.

Ask:

Give one synonym

Input

Give one antonym

Input

Button:

Check My Answers

24. SYNONYM / ANTONYM VALIDATION

Use semantic AI evaluation.

Do NOT require an exact predefined answer.

For example:

Word:

Meticulous

Valid synonyms may include:

Careful

Precise

Thorough

Exact

Valid antonyms may include:

Careless

Negligent

Sloppy

The system should recognize legitimate alternatives.

If correct:

✓ Correct

If incorrect:

Try Again

Give a short explanation.

Do not reveal the answer unnecessarily before the user retries.

25. DAILY SCORE

After completing all stages:

Calculate:

Writing

40%

Speaking

40%

Recall

20%

Example:

Writing
91%

Speaking
90%

Recall
100%

Overall:

91%

Make the scoring system configurable.

26. COMPLETION SCREEN

Create a satisfying completion screen.

Example:

🎉 Challenge Complete!

Today's Word:

METICULOUS

Writing
91%

Speaking
90%

Recall
100%

Overall Score

91%

Then:

🔥 Streak Increased!

Current Streak:

13 Days

Longest Streak:

21 Days

Words Learned:

25

Add a short encouraging message.

Example:

"Another word mastered. Keep your streak alive tomorrow!"

27. STREAK SYSTEM

A streak increases by exactly +1 only when the user completes the entire daily challenge.

Required:

✓ Word learning

✓ 3 sentence writing

✓ Speaking

✓ Synonym

✓ Antonym

Only after all required stages pass:

Streak +1

Rules:

Only one streak increase per calendar day.

Repeating the challenge does not increase the streak again.

Retries do not affect the streak.

Missing a day breaks the current streak.

Longest streak must remain stored.

Use the user's local timezone.

Correctly handle date changes and midnight.

Do not allow client-side manipulation of streak values.

28. VOCABULARY HISTORY

Create:

My Vocabulary

Display:

DateWordWritingSpeakingRecallOverallStatus

Allow:

Search

Date filtering

Score filtering

Sort by newest/oldest

Open individual word details

Individual history page should show the complete challenge.

29. WORD MASTERY

Separate Streak from Mastery.

Streak

Measures consistency.

Mastery

Measures how well the user performed with vocabulary.

Track:

Learned

Practiced

Written

Spoken

Recalled

Mastered

Needs Revision

Example:

🔥 30 Day Streak

📚 30 Words Learned

⭐ 22 Words Mastered

🔁 8 Words Need Revision

30. REVISION SYSTEM

Create a dedicated:

Revision

page.

Bring previously learned words back periodically.

Example:

Revision Word

Meticulous

Challenge:

Write a new sentence using this word.

Then:

Speak a sentence using this word.

Then:

Give a synonym.

Use a simple spaced-repetition concept.

Do not make revision overly complex in the first version.

31. ACHIEVEMENTS

Create achievement badges.

Examples:

🔥 First Step

Complete your first challenge.

🔥 Week Warrior

7-day streak.

🔥 Two Weeks Strong

14-day streak.

🔥 Monthly Master

30-day streak.

📚 Word Collector

Learn 25 words.

📚 Vocabulary Builder

Learn 50 words.

🎙 Speaking Star

Achieve an average speaking score above 90%.

✍️ Writing Master

Achieve an average writing score above 90%.

⭐ Vocabulary Master

Master 50 words.

Show:

Earned achievements

Locked achievements

Progress toward locked achievements

32. PROGRESS ANALYTICS

Create a clean analytics page.

Show:

Current streak

Longest streak

Words learned

Words mastered

Average overall score

Average writing score

Average speaking score

Average grammar score

Average pronunciation score

Weekly completion

Monthly completion

Use simple charts.

Do not overload the interface with unnecessary graphs.

33. PROFILE

Display:

Name

Email

Current Streak

Longest Streak

Words Learned

Words Mastered

Average Score

Achievements

Allow basic profile editing.

34. SETTINGS

Include:

Name

Email

Password change

Notification preferences

Timezone

Theme preference

Do not add unnecessary settings.

35. DATABASE

Use a proper relational database such as PostgreSQL.

Suggested entities:

User

id
name
email
password_hash
timezone
created_at
updated_at

VocabularyWord

id
word
pronunciation
meaning
part_of_speech
prefix
root
suffix
example
difficulty
created_at

DailyChallenge

id
user_id
vocabulary_word_id
challenge_date
status
writing_score
speaking_score
recall_score
overall_score
completed_at

SentenceSubmission

id
challenge_id
sentence_number
sentence_text
typing_duration
score
feedback
passed
created_at

SpeechSubmission

id
challenge_id
audio_reference
transcript
pronunciation_score
grammar_score
usage_score
fluency_score
overall_score
created_at

RecallSubmission

id
challenge_id
synonym
antonym
synonym_correct
antonym_correct
score
created_at

Streak

id
user_id
current_streak
longest_streak
last_completed_date

Achievement

id
name
description
criteria

UserAchievement

id
user_id
achievement_id
earned_at

RevisionItem

id
user_id
vocabulary_word_id
next_review_date
review_count
mastery_status

Use appropriate relationships, indexes, and constraints.

36. API ARCHITECTURE

Create clean REST APIs.

Examples:

POST /api/auth/register

POST /api/auth/login

GET /api/user/profile

PUT /api/user/profile

POST /api/vocabulary/analyze

POST /api/challenge/start

POST /api/challenge/sentence/evaluate

POST /api/challenge/speech/analyze

POST /api/challenge/recall/evaluate

POST /api/challenge/complete

GET /api/streak

GET /api/vocabulary/history

GET /api/vocabulary/{id}

GET /api/revision

GET /api/achievements

GET /api/progress

Adapt the exact API naming to the implementation.

37. AI ARCHITECTURE

Create a dedicated AI service layer.

Example:

AIService

├── WordAnalysisService

├── SentenceEvaluationService

├── RecallEvaluationService

└── RevisionService

AI output should be structured JSON.

Example:

{
"word": "meticulous",
"meaning": "...",
"partOfSpeech": "adjective",
"pronunciation": "...",
"prefix": null,
"root": null,
"suffix": null,
"synonyms": [],
"antonyms": [],
"difficulty": "intermediate"
}

Sentence evaluation should return structured data such as:

{
"targetWordDetected": true,
"grammarScore": 92,
"usageScore": 95,
"contextScore": 90,
"structureScore": 88,
"naturalnessScore": 91,
"overallScore": 92,
"passed": true,
"feedback": "Excellent use of the word."
}

Do not use free-form AI responses for critical application logic.

38. AI EVALUATION PRINCIPLES

The AI should:

Accept legitimate answers.

Recognize multiple valid synonyms.

Recognize multiple valid antonyms.

Avoid inventing word morphology.

Avoid rejecting valid sentences.

Distinguish grammar errors from stylistic preferences.

Give constructive feedback.

Avoid doing the challenge for the user.

Maintain consistent evaluation criteria.

39. UI/UX DESIGN

The interface should look like a modern language-learning product.

Design characteristics:

Clean

Minimal

Premium

Friendly

Motivational

Professional

Responsive

Avoid:

Childish cartoon design

Excessive animations

Clutter

Excessive gradients

Generic chatbot appearance

Use:

Cards

Progress indicators

Streak visuals

Clear typography

Strong hierarchy

Subtle animations

Empty states

Loading states

Success states

40. DAILY CHALLENGE UX

The daily challenge should feel like a small game.

For example:

Today's Goal

🎯 Learn 1 word

✍️ Write 3 sentences

🎙 Speak 1 sentence

🧠 Recall 2 relationships

🔥 Earn today's streak

Show progress continuously.

41. MOBILE EXPERIENCE

The application must work well on:

Mobile

Tablet

Laptop

Desktop

The speaking interface should be particularly mobile-friendly.

Use large recording controls.

Make text inputs comfortable to use.

42. ACCESSIBILITY

Support:

Keyboard navigation

Proper form labels

Focus states

Screen reader compatibility

Accessible progress indicators

Good contrast

Clear error messages

43. PERFORMANCE

Optimize AI usage.

Do not repeatedly analyze the same word unnecessarily.

Cache word analysis where appropriate.

Use loading indicators.

Examples:

"Analyzing your word..."

"Checking your sentences..."

"Analyzing your speech..."

"Checking your answers..."

Handle API timeouts gracefully.

44. SECURITY

Implement:

Password hashing

Authentication

Authorization

Input validation

API validation

Rate limiting where appropriate

Secure audio handling

Secure environment variables

Protected AI API keys

Never expose:

API keys

Database credentials

JWT secrets

to the frontend.

45. ERROR HANDLING

Handle:

Invalid word

Duplicate/recent word

Empty sentence

AI failure

Network failure

Microphone permission denied

Speech service failure

Invalid synonym

Invalid antonym

Database failure

Session expiration

Messages should be user-friendly.

Never display raw stack traces.

46. TESTING

Create unit and integration tests for:

Registration

Login

Word validation

Word analysis

Sentence evaluation

Sentence retry

Copy detection

Speech submission

Speech evaluation

Synonym validation

Antonym validation

Daily completion

Streak calculation

Duplicate completion prevention

Missed-day handling

Revision

Achievements

User authorization

47. COMPLETE END-TO-END TEST

Test this exact scenario:

Register user

↓

Login

↓

Open Dashboard

↓

Start Today's Challenge

↓

Enter:

"Meticulous"

↓

AI analyzes word

↓

View word breakdown

↓

Listen to pronunciation

↓

Write Sentence 1

↓

Write Sentence 2

↓

Write Sentence 3

↓

AI evaluates sentences

↓

Correct any failed sentences

↓

Writing completed

↓

Open Speaking Challenge

↓

Record sentence

↓

Stop recording

↓

Speech converted to transcript

↓

Target word detected

↓

Pronunciation evaluated

↓

Grammar evaluated

↓

Speaking completed

↓

Open Recall Challenge

↓

Enter synonym

↓

Enter antonym

↓

AI validates answers

↓

Daily score calculated

↓

Challenge completed

↓

Streak +1

↓

History updated

↓

Achievements checked

↓

Dashboard updated

48. EDGE CASES

Handle these correctly:

User completes the challenge twice in one day

Do not increase streak twice.

User misses one day

Current streak resets according to the streak rules, but longest streak remains.

User enters the same word again

Warn if it was recently practiced.

User gives an uncommon but valid synonym

Accept it.

User gives a grammatically correct sentence with unusual style

Do not reject it simply because the AI would phrase it differently.

Word has no reliable prefix/suffix

Do not fabricate one.

Microphone unavailable

Provide a clear error and allow retry.

Speech recognition is imperfect

Show the detected transcript and allow another attempt.

49. FUTURE-READY ARCHITECTURE

Keep the architecture extensible for future features such as:

AI conversation practice

Daily vocabulary notifications

Leaderboards

Custom vocabulary lists

Difficulty progression

Voice conversations

Personalized learning plans

Multiple languages

Advanced pronunciation analysis

Do NOT implement these unless needed for the MVP.

Design the architecture so they can be added later.

50. MVP PRIORITY

If implementation needs to be done incrementally, prioritize in this exact order:

PHASE 1

Authentication

Dashboard

Word input

AI word analysis

PHASE 2

Three-sentence challenge

AI evaluation

Retry mechanism

Anti-copy controls

PHASE 3

Speech recording

Speech-to-text

Speaking evaluation

PHASE 4

Synonym/antonym validation

Daily score

Streak system

PHASE 5

Vocabulary history

Revision

Achievements

Analytics

Profile/settings

51. FINAL PRODUCT IDENTITY

The product should communicate one simple idea:

Don't just learn a word. Prove that you can use it.

The complete experience is:

ENTER WORD

↓

UNDERSTAND IT

↓

WRITE IT

↓

GET AI FEEDBACK

↓

SPEAK IT

↓

GET AI SPEECH FEEDBACK

↓

RECALL IT

↓

GET SCORE

↓

🔥 BUILD YOUR STREAK

52. FINAL ACCEPTANCE CRITERIA

The application is complete only when:

✓ It works as an independent application.

✓ Authentication works.

✓ User can enter a vocabulary word.

✓ AI provides a reliable explanation.

✓ Word pronunciation is available.

✓ Prefix/root/suffix information is not fabricated.

✓ User must write 3 original sentences.

✓ AI evaluates the sentences.

✓ User can retry incorrect sentences.

✓ Reasonable anti-copy controls exist.

✓ User must speak using the target word.

✓ Speech is transcribed.

✓ Speech is evaluated.

✓ Pronunciation is evaluated where technically supported.

✓ User provides a synonym.

✓ User provides an antonym.

✓ AI validates both semantically.

✓ Daily score is calculated.

✓ Streak increases only after full completion.

✓ Streak cannot be increased twice on the same day.

✓ Vocabulary history is stored.

✓ Mastery is tracked separately from streak.

✓ Revision works.

✓ Achievements work.

✓ Analytics work.

✓ Responsive design works.

✓ Authentication and authorization are secure.

✓ API keys are protected.

✓ Error handling works.

✓ Critical workflows are tested.

FINAL DEVELOPMENT INSTRUCTION

Build this application from scratch as a standalone AI-powered vocabulary learning product.

Do not assume any previous project exists.

Do not integrate external project functionality unless explicitly required by this application's own architecture.

Focus on making the core daily experience extremely smooth:

LEARN → WRITE → SPEAK → RECALL → SCORE → 🔥 STREAK

Before implementing the full application, first inspect the available development environment, choose the appropriate technology stack, create the architecture, and then implement the application incrementally.

Do not stop at a landing page or UI mockup.

Build the actual working application with frontend, backend, database, AI integration, speech workflow, authentication, streak logic, and testing.    build this

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://speakwrite-streak.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9b7161c4-d5df-4c2e-bfc5-a99af08f04df).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
