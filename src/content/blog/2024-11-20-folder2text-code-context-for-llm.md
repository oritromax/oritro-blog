---
title: Folder2text - code context for LLM
date: 2024-11-20 14:43:11
tags:
    - code
    - llm
    - programming
categories: 
    - llm 
    - codebox
---

I made a tool, **folder2text**. 

🤖You are using a LLM to write or help with your code, this is gonna be a very important tool for you. 

Most LLM like OpenAI's chatGPT(4,4o) or claude (3,3.5) has a limited context window. When you are writing a lot of code, it's nearly impossible to provide proper context without copying all of your code into the LLM chatbox. And copy pasting also has limitations due to token size. 

**folder2text** turns all of your code from a specific folder into one .txt file. Its properly formatted with the exact information your AI friend need to understand the entire context of your project. And it also makes sure only the code you wrote is a part of it, packages and vendor files are ignored. 

🌐 It has already been published on NPM, 

[https://github.com/oritromax/folder2text](https://github.com/oritromax/folder2text)

[https://www.npmjs.com/package/folder2text](https://www.npmjs.com/package/folder2text)

`npm install -g folder2text`

To run the tool, simply point towards your folder 

`folder2text /path/to/your/folder`

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/4c7tdi87zol6x53ev9q5.png)

Hope it helps in your AI-fueled development. 