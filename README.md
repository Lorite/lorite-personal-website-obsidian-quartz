# Lorite's Notes

## Build and Preview

- `npm run sync:published -- --source "/home/lori/git/lorite-obsidian-notes" --dest "content"`
- `docker run --rm -it -p 8080:8080 -p 3001:3001 -v /home/lori/git/lorite-personal-website-obsidian-quartz/content:/usr/src/app/content $(docker build -q .)`

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
