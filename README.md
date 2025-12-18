# Lorite's Notes

## Build and Preview

- Update the generated content files after modifying a note in Obsidian (**run whenever you want to see the changes**): `npm run sync:published -- --source "/home/lori/git/lorite-obsidian-notes" --dest "content"`
- Start the development server (run once): `docker run --rm -it -p 8080:8080 -p 3001:3001 -v ./content:/usr/src/app/content $(docker build -q -t quartz-dev -f Dockerfile.dev .)`
- You might need to modify a content file once to trigger the server to pick up changes. For example, change a character in `content/index.md` and save it. This happens because the serve command is run before the folder is mounted.
- Open your browser to `http://localhost:3001` to preview the site.

## GitHub repository

- From https://quartz.jzhao.xyz/setting-up-your-GitHub-repository
  - This is a helper command that will do the initial push of your content to your repository

  ```sh
  npx quartz sync --no-pull
  ```

  - In future updates, you can simply run `npx quartz sync` every time you want to push updates to your repository.

> Flags and options
>
> For full help options, you can run `npx quartz sync --help`.
>
> Most of these have sensible defaults but you can override them if you have a custom setup:
>
> - `-d` or `--directory`: the content folder. This is normally just `content`
> - `-v` or `--verbose`: print out extra logging information
> - `--commit` or `--no-commit`: whether to make a `git` commit for your changes
> - `--push` or `--no-push`: whether to push updates to your GitHub fork of Quartz
> - `--pull` or `--no-pull`: whether to try and pull in any updates from your GitHub fork (i.e. from other devices) before pushing

# Quartz v4

> “[One] who works with the door open gets all kinds of interruptions, but [they] also occasionally gets clues as to what the world is and what might be important.” — Richard Hamming

Quartz is a set of tools that helps you publish your [digital garden](https://jzhao.xyz/posts/networked-thought) and notes as a website for free.
Quartz v4 features a from-the-ground rewrite focusing on end-user extensibility and ease-of-use.

🔗 Read the documentation and get started: https://quartz.jzhao.xyz/

[Join the Discord Community](https://discord.gg/cRFFHYye7t)

## Sponsors

<p align="center">
  <a href="https://github.com/sponsors/jackyzha0">
    <img src="https://cdn.jsdelivr.net/gh/jackyzha0/jackyzha0/sponsorkit/sponsors.svg" />
  </a>
</p>
