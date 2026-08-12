# Michanoku Uploader

The Odin Project File Uploader

---

## Core Features

### Authentication & Accounts

Users can create accounts using an email address and password. Passwords are securely hashed before being stored in the database.

Each user is given a root folder that acts as their "home" folder. The root folder cannot be renamed, moved, deleted, or shared. Its contents can be modified normally by the user.

Users can change their email address or password. Account deletion is not currently supported, as this is a practice project.

User authentication is handled using Passport.js with a local strategy and persistent sessions stored in the PostgreSQL database.

---

### File Management

Users can:

- Upload files
- Rename files
- Move files between folders
- Download files
- Delete files
- Share files with other people

Individual files are limited to 100 KB, and each user has a total storage limit of 500 KB.

There are currently no restrictions on file type.

Files are stored using Supabase Storage, while file metadata such as the original filename, size, upload time, ownership, and folder are stored in a PostgreSQL database using Prisma.

Files generally belong to a folder, either the user's root folder or a folder created by the user.

---

### Folder Management

Users can:

- Create folders
- Rename folders
- Move folders
- Download folders
- Delete folders
- Share folders

Folders can be nested to any depth.

A folder can be moved into the user's root folder or into another folder created by the user. Folders cannot be moved into themselves or into one of their own descendants.

Downloading, deleting, or sharing a folder includes its entire contents, including all descendant folders and files.

Folder downloads are generated as ZIP archives while preserving the folder structure.

Folders generally have a parent folder, either the user's root folder or another folder created by the user.

---

### Sharing

Users can share individual files or entire folders.

The root folder cannot be shared.

#### File Sharing

When a file is shared, a unique link is generated that allows anyone with the link, including unauthenticated users, to view and download the file.

#### Folder Sharing

When a folder is shared, a separate unique link is generated. Anyone with access to the link can browse the shared folder and access its subfolders and files.

Shared folders and their contents can also be downloaded as ZIP archives.

When creating a share, the owner can specify a duration between 1 and 30 days. Once the share expires, the link becomes invalid and the shared content can no longer be accessed.

#### Sharing and Moving Content

Moving shared content requires additional handling to ensure that shared and private content are not mixed.

- Moving shared content into a private folder makes the moved content private.
- Moving a private file or folder into a shared folder causes the moved content to become part of that shared structure.
- Moving shared content into a different, unrelated shared folder transfers its access to the new shared structure.
- Moving a shared folder into another shared folder causes it to join the destination share while removing its previous independent share.
- Moving shared content between shared structures preserves the appropriate existing share relationships where applicable.
- Parent folders are not affected when individual files or subfolders are moved out of a shared structure.

Currently, separate independent share structures within the same shared parent folder are not supported.

---

### Storage & Validation

In addition to standard user-input validation, files and folders are subject to a number of ownership, naming, and storage restrictions.

Users cannot:

- Create two folders with the same name in the same location
- Rename a file or folder to a name already used in the same location
- Move a file or folder into a location containing an item with the same name
- Upload a file larger than 100 KB
- Exceed their total storage limit of 500 KB
- Modify another user's private files or folders
- Modify their root folder itself

File storage is handled by Supabase Storage.

The 100 KB per-file and 500 KB per-user limits are intentionally small for this practice project. Supabase provides considerably more storage than this application needs, but the limits prevent a small public deployment from accumulating unnecessary data over time.

Because users may upload potentially sensitive files, authorization middleware is used throughout the application to verify that requested files and folders belong to the authenticated user before allowing access or modification. Shared content is handled separately and is accessible through its valid share link.

---

### Testing

A comprehensive collection of automated tests has been created to verify that the backend behaves as intended.

Tests cover:

- Database operations
- User registration and authentication
- User account management
- File uploads and downloads
- File ownership
- Folder creation and management
- Nested folders
- Folder movement
- Recursive folder downloads
- File and folder deletion
- Private file and folder access
- Shared files
- Shared folders
- Share expiration and removal
- Moving content between private and shared folders
- Ownership and authorization edge cases

Tests are written using Jest and Supertest.

The test environment uses a separate PostgreSQL database and a separate storage path in Supabase to prevent tests from interfering with production data.

---

### Deployment / Infrastructure

The application is deployed using Render.

The production database is hosted by Neon and accessed through Prisma.

Files are stored using Supabase Storage rather than on the application server.

The application therefore uses three separate services:

- **Render** - application hosting
- **Neon** - PostgreSQL database
- **Supabase** - file storage

Environment variables are used for database credentials, application secrets, and Supabase credentials. Sensitive environment files are excluded from version control.

Prisma migrations are used to manage database schema changes between environments.

## Reflections

### Project development

This project took me way longer than I had anticipated. Not only did I quickly realize that I want to challenge myself and provide some additional features not outlined in the specifications, but I also had some real life things happening that prevented me from using as much time as I could on this project. I do have a full-time job and a family after all. So I was hoping to maybe take 3 weeks to finish it but it turned out to be more like 2 months. 

### What I Learned

I realized that "storage" as I imagined it doesn't really have to work the same on a webserver. At first I thought making folders and putting files in the would be easy, until I realized that the only things you actually have to put on the server are files. Folders are just structure and don't need to "exist" on the server, just in the database. I guess in hindsight it makes sense but I had never thought about it before. 

I also learned that express handles some things way differently and needs more guidance than what I am used to from frameworks like Django and Flask. I'd be lying if I said I didn't get frustrated sometimes, thinking, "Why does this not work out of the box?", but finding out how to get express to understand it was always a fun exercise. I probably already forgot half of it, but for now I understand that there is much more configuration and personalization going on than I thought. 

I spent most of the time working on this app writing tests and rewriting code through testing. This was the app that really taught me how to make use of tests to drive the development. I probably still made some mistakes or used inefficient practices, but having all tests pass for the functionality I was going to build before even looking at the browser itself was quite the different approach for me. 

### Challenges

Some major challenges came from the features I wanted to add, like being able to move files and folders around, and sharing things through a folder hierarchy, instead of sharing everything individually. It was really hard to figure out what happens when a user shares something that was part of a previously shared folder, or when a user tries to make something private that is part of a shared folder, or when a user moves things around between different shares or private folders. This process took me a long time to come up with the solutions that now exist in the app, and I still think there is room for much improvement. Users should be able to share nested contents with different people without having to worry about each individual share. But this is currently not supported. A guest will always have access to ALL content that is related to the shared folder, no matter how the user got there. It was hard to do and I decided to leave it like it is now, so I don't go more overboard than I already did. 

I also really struggled at first to come up with an interface that allows users to move things around, as that would involve displaying the users folder tree one folder at a time. Also the user should not be able to move things inside themselves so that was another nut to crack. 

### What I'd Do Differently

While developing I used lots of middleware to always get the user the right folder, file, or share, and make sure the user owns the private content they want to access. This caused a lot of instances where I had to go back and forth between the controllers and the middleware to figure out what is going on, so in the future, I think I would not entirely abandon this concept but maybe reduce it or streamline it so it's easier to follow back when something happens. But for a first try at this sort of complex project, I think it worked out alright. I definitely would spend more time planning with the knowledge that I have now about this project. 
I'm definitely looking forward to implementing some of this in the next project. 

Overall, this project ended up being much larger than the original assignment, but that was ultimately a good thing. I got to work through problems that I would not have encountered if I had only implemented the minimum requirements. Some of the solutions are probably more complicated than they need to be, but I now have a much better understanding of why they are complicated and what I would change if I were building the application again.