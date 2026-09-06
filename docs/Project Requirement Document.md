\# Project Name: Redacted

Setting: Modern City



Genre: Detective and Social deduction



Number of players: 1-2



Game engine: web



Core features:

\- Procedurally generated cities and cases

\- CCTV Camera

\- Place visit - can travel anywhere in the city

\- forensic laboratory

\- interrogation system

\- search the place

\- fingerprints and foot prints

\- buildimgs, corridors, and rooms

\- call logs/ messages/ social posts - phone and laptops

\- public records



\# Gameloop

\## Case brief

Game starts and gives us the initial info on the case and nothing, we start from here with our own decisions and skills

\- where

\- when

\- what

\- who reported

\- other small necessary info



\## Case Close

We can press a button to finally report our findings and on each correct thing reported we get a star, target is to get 5 stars.

\- name of killer

\- reason

\- weapon

\- evidence

\- how did he pulled this off



\## Time system

\- We have limited time (optimal time guessed by AI + 1 day of in-game time)

\- Travelling, getting reports from doctor or other helpers takes time

\- Users can choose their own case deadline instead of the default time.



\## Clue Board

Players can create notes and attach strings to show connections. basically it is also a graph. one click each node you can open the entire note.



\## Generation Plan

we start by deciding the type of case and a complex story based on difficulty chosen. Then we decide all the key roles, NPCs, clues, location. Then we prepare a cool timeline. scattering cameras, and other stuff.

Suspect count by difficulty:

\- Easy: around 3-4 suspects

\- Normal: around 6-7 suspects

\- Hard: 10 or more suspects

There is no hard upper limit on city size or case size; generation should be limited only by solvability and practical runtime constraints.

Preparing expected way of solving the case.

All of this is done by an AI.

It also generates map, buildings, cooridors, rooms, public records and all remaining stuff.



\# Types of cases

\- Murder

\- Theft

\- robbery

\- Smuggling - later versions

\- Trafficking - later versions



\# Procedural generation

\## Map

The city is a graph made up of nodes containing all building and edges as roads.

We will have important places like:

\- Bureau that has Public records, Public CCTVs,etc

\- crime scenes

\- suspect homes

\- forensic Lab

\- Prison

\- Pawn shops

\- Gun shops

\- Dealers



\## Building

Same template of graph as city but we will have these here:

\- Lifts

\- camera room

\- stairs

\- hostel staff



\## Lifts

using lifts you can travel to any floor it will be a simple number picker to go to a floor 



\## corridors

Corridors are a matrix where 1 means a room and 0 mean open area (cooridor), 2 means staircase, 3 means lifts, etc

When you press on a room you can go to the room.

you can also search a corridor.



\## Rooms

just a generated image, not for all rooms just for the room where crime took place.

May contain deadbody and other clues but the image itself won't be interactive as of V1 maybe in future we get it to work but the search system here will work a lil different as explained later in this doc.



\## Public records

This is a simple lookup table or record where you can search people by name, phone number, car's number plate, address, ip address, image.



You will get information like:

\- Photo

\- Name

\- Blood type

\- address

\- Phone number

\- gender

\- car's number

\- background

\- education

\- workplace



\# CCTV System

CCTV has no visual representation at all, ever. It is only textual/data records for cameras, time windows, observed people, vehicles, and events.



Inspiration : Shadows of doubt



\# Forensic Lab

2 features - Doctor and an forensic machine/table



\*\*Doctor\*\* : for dead bodies, we can ask the doctor to perform tests and give us the possible cause of death, timing, marks of chaotic physical fight. We can ask doctor to get fingerprints or foot size of a person. If the deadbody is unrecognizable then he might tell age and gender too and other necessary information.



\*\*forensic machine/table\*\* : who have a list of items found on crime scene or any other place we searched. we can place these on this table one by one and it will scan that and give us information like fingerprints, footprints size and type (if that was given), blood found or not? if yes then what type.



\# Interrogation system and UI

Just the image of the suspect and a chat dialog box on the right side, where we can discuss things.

Players have two interrogation scenarios: call the suspect/NPC to the bureau, or go meet them at their location.

Conversations will be recorded so we can just come back and see it again



\# Concept of searching a place and how it will work

So, we will have an image of the scene (non-interactive) and we ask our sub-investigators to search and give all possible clues and items to us, which we will later use in our forensic test. All the collected clues and items will be stored in player inventory.



\# Phones and Laptops

\## Phone

A simple UI with 2 icons :

&#x20; - Contact: call history (time, name/unknown number, incoming/outgoing, duration)

&#x20; - Messages: names/unknown, their conversation and message timings



\## Laptop

\- Recycle bin: deleted files, data, time of deletion

\- files on desktop: data (if we actually need it)



\# NPC system

Important NPCs get there personality types while initial case generation, rest are random.

They have their own knowledge of the case, experience, info, and behaviour.



\*\*Types of NPC Behaviours:\*\*

\- straight forward

\- nervous

\- clumsy

\- non budging ones

\- excited

\- Introvert

\- fearful

\- not interested

\- liars and cunning



\# Future Considerations

\- power cuts - may cause cctv malfunction

\- witness can help to make sketch of a suspect

\- For hard mode, in search you have to ask for everyplace to search instead of sub-investigators. like check beneath the bed, check lamp,etc.

\- Criminal killing suspects and actively trying to sabotage our investigation using fake clues and eliminating clues.

\- Gallery inside phones

\- Wallpapers, games inside phones and laptops (just for fun)

\- DNA to face reconstruction

\- documents

\- emails and browser history

