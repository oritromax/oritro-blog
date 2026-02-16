# Blog Post Generator

A Go-based CLI tool to generate properly formatted markdown files with frontmatter for blog posts.

## Features

- Automatically scans existing blog posts to extract all unique categories
- Prompts for:
  - Title (required)
  - Date (defaults to current date/time)
  - Tags (comma-separated)
  - Categories (select from existing categories found in your blog)
- Generates a properly formatted markdown file with YAML frontmatter
- Creates the file in the correct location: `src/content/blog/`
- Auto-generates filename based on date and slugified title

## Installation

### Build the tool

```bash
cd cli
go build -o blogpost
```

### Make it executable (Linux/macOS)

```bash
chmod +x blogpost
```

## Usage

The tool automatically finds the blog directory by searching upward from your current location. You can run it from anywhere within the project:

**From the project root:**
```bash
./cli/blogpost
```

**From the cli directory:**
```bash
cd cli
./blogpost
```

**From any subdirectory:**
```bash
../cli/blogpost
```

You can then open the file and start writing the content of your blog post below the frontmatter.

## Requirements

- Go 1.21 or later (for building)
- The tool can be run from anywhere within the oritro-blog project directory

## Notes

- The date format is: `YYYY-MM-DD HH:MM:SS`
- Tags should be comma-separated
- Multiple categories can be selected by entering comma-separated numbers
- The filename is automatically generated as: `YYYY-MM-DD-slugified-title.md`
