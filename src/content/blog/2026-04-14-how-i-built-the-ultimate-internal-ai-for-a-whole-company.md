---
title: How I built the ultimate internal AI for a whole company
date: 2026-04-14 12:52:35
tags:
    - ai
    - llm
    - fine-tuning
    - rag
    - mcp
categories:
    - ai
description: Before you think this as another TechBro pitching his new AI Startup, it's not. I am gonna go into a lot of technical details, so if that's your thing, read on. Believe it or not, this post is 100% hand written, no AI was involved in a post about AI. The cover photo is AI generated, obviously.
featured_image: https://img.sglab.ioritro.com/i/1uZkJnnt
---

## The Problem

The modern software engineering and the corporate industry that relies on that, is built on a few key components. People, __lots of coffee__, Jira ( or other task management tool, if you hate how slow Jira is ) and lots and lots of documentation. 

At first, it all seems to fit nicely in a well-oiled machine. Everyone is working together, building a system from the ground up, solving problems, writing tickets and specs. It goes well for the honeymoon period. 

Then talents move away. Software Engineers go to other places, their knowledge of a massive system can't be properly fit into a few Confluence pages. Product designers move on, their intention and process behind something is summarized, losing its essence. Product managers move on, with them goes smaller but crucial details, why was a certain decision made that changed a small but important part of the product. 

Now this knowledge is written somewhere, maybe in chat, or a group call that was never recorded or hopefully in the comment or body of a ticket. 

Now new members are coming in, they need to understand the system, the product, the process. The 20 Confluence pages you have written for this very purpose, have not been maintained or updated with what was changed since they were written. They provide valuable context, but that's a 10,000ft overview. It doesn't tell you the datatype of a variable, it just tells you it exists. 

And if a company has been running for over a few years, this becomes a different kind of nightmare. Plus, if you have a publicly accessible product ( a SaaS or HID or IoT ) that's even worse. Now you have so many issues, complaints, tickets, it's almost impossible to figure out why something was changed 3 years ago, unless you know the very specific thing to look for. 

That's a lot of context, so let's get to the __meat__ of the discussion. 

## The Approach

### The 'RAG' Approach

My first approach was, let's build a RAG. Retrieval Augmented Generation. Put a regular LLM model behind it, add context based on what was asked and wham bam done ( I don't know where I heard this phrase first, but it's stuck in my head and I use it way too much. )

Before I started the POC for this, I started to note down how this will go and certain things started to appear problematic. The LLM model has context, some data we shoved down its throat, but without the actual knowledge of that data's purpose, it's not going to be able to do anything useful. It will provide results for sure, hundreds of thousands of companies are doing that. But due to the nature of our business, the data itself is not enough. Understanding what the data means is also important. 

Now I can simply have an instruction set in the master prompt about explanation of the data and the LLM should be able to make sense of it, right? 

For 90% of it, yes. But the other 10% is where there are overlapping business decisions, which got changed over the years and are no longer valid, and will also be picked up by a semantic search. And yes I know, I can handle that by setting priorities of dates and stuff, I will get there later. 

### The 'Fine-tuning' Approach

Fine-tuning a model means, you start with a base model, teach it important concepts and patterns, so it can provide you results that align with your requirements. You don't need to train a new model from scratch. 

Thus, my journey into fine-tuning began. Now before this point, I have only dabbled into fine-tuning, using Phi-3. Because that's the only model I could realistically fine-tune with my 2080 Ti without resorting to corner cutting. 

So this time, I thought, why not try that approach? 

Fine-tuning a model requires three things.

- A base model as the foundation
- Enough VRAM to run the training 
- A well-organized dataset

The dataset is extremely important here. Patterns, knowledge, concepts are far more important than dumping a bunch of data and calling it a day. Quality is the key, not quantity. 

#### Knowledge and Concepts

So what actually goes into the dataset? That depends on what you wanna teach it. 

Let's say you have a machine that works as a POS. How that machine works, that knowledge is important for fine-tuning. What sales that machine has generated, not so much. A few hundred samples of sales data will help the fine-tuning process understand what it actually needs to understand about sales data, that's about it. If you wanna detect anomalies or weird perceived behavior, you can add a few thousand, but the whole sales database doesn't make any sense. The model only needs to know how to understand the sales data. 

Same goes for any existing documentation you have. Confluence or similar note taking apps have a properly documented structure, so that shouldn't be that difficult. But what you need to teach the model is, what is unique or specific to your company. How do you document stuff? How do you report an incident? How do you write a new feature spec? How do you write the resolution of a major bug? Examples of those go into fine-tuning. 

Next is key business concepts. We all know what some industry terms mean. QR code is QR code, nobody ( a sane person ) will use this specific word for anything else. But every company has internal terms, product names, product behaviors, logic, structure, rules that are unique to that company ( or important ). Those go into fine-tuning. 


#### Data Prep 

As mentioned earlier, quality data is king here. Your dataset is a collection of instruction-response pairs. You need to prepare it based on what you are trying to teach the model. For example,

```
date: 2022-03-15, rep: John, region: SE, product: SKU-4421, qty: 12, revenue: 4800, discount: 10%
```
This is an example row of a sale. On its own, the LLM could make some suggestion based on the data, but that won't help you in most cases. It doesn't know what you want from this data. So we create a pair, 

```
{
  "instruction": "Summarize this sales transaction.",
  "input": "Date: 2022-03-15 | Rep: John | Region: Southeast | Product: SKU-4421 | Qty: 12 | Revenue: $4800 | Discount: 10%",
  "output": "John closed a mid-size deal in the Southeast region on March 15, 2022, selling 12 units of SKU-4421 for $4,800 with a 10% discount applied."
}
```
Each pair is a JSON object. Your full dataset is a JSONL file — one pair per line. Now this JSON pair tells the model, this is what you will be asked, and this is how you should respond ( a very simplified way of putting it ). 

__Do I have to do this manually?__

If your data is well structured, like pulling from a SQL database, you can automate the pair generation programmatically. If it's not structured, you can use a larger LLM to generate them for you. One important note here, if your dataset contains sensitive or confidential information, it might not be a good idea to use a third party model. Check with your company's policy or legal team on this. Running this generation using a locally running open source model might be a good idea in that case, though it will take considerably longer. 

#### The Training

I am using [unsloth](https://unsloth.ai/) for the training. It's more memory efficient, its attention implementations are very optimized. It's free for a single-GPU setup, which I technically have. Plus some other shenanigans I pulled. I will go over it shortly. 

I am going with QLoRA. What it is and how it works, is beyond the scope of this post. A very summarized version is, instead of updating every single weight in the base model, it freezes the base model, then inserts LoRA Adapters ( trainable matrices ) into specific layers. Plus it adds 4-bit quantization, so that cuts VRAM usage by a lot. 

For my specific setup, the parameters that matter, written in plain text. 

```
load_in_4bit // base model to 4bit - save VRAM
r = 16 // LoRA Rank
lora_alpha = 16 // I found best result when set to same as LoRA rank
max_seq_length = 2048 // default
per_device_train_batch_size = 2 
gradient_accumulation_steps = 4
num_train_epochs = 3
learning_rate = 2e-4
```

Again this is my setup, you might have to adjust this. One important note, I initially set this up for my 1660 Super OC Edition. 6 GB VRAM, later moved to my desktop which has a 2080 Ti - 11 GB VRAM, so some adjustments were made later. This is a somewhat safe default. 

This is my exact setup, in Python

```python
from unsloth import FastLanguageModel
from transformers import TrainingArguments
from trl import SFTTrainer

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "meta-llama/Llama-3.2-3B-Instruct",
    max_seq_length = 2048,
    load_in_4bit = True,
)

model = FastLanguageModel.get_peft_model(
    model,
    r = 16,
    lora_alpha = 16,
)

trainer = SFTTrainer(
    model = model,
    train_dataset = dataset,
    args = TrainingArguments(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 4,
        num_train_epochs = 3,
        learning_rate = 2e-4,
        output_dir = "./output",
    ),
)

trainer.train()
model.save_pretrained("./my-adapter")
tokenizer.save_pretrained("./my-adapter") 
```

When the training is complete, you will get a LoRA adapter, somewhere between 50-200 MB in size. This adapter sits on top of your base model at inference time. Easy for distribution, easy for future retraining.  

> One very important thing during training, watch your eval loss. At some point it would drop and become steady, plateau. If your train loss keeps going down but eval loss doesn't or starts rising, it could mean you are overfitting. You should stop. 

#### The Shenanigans

I do have a few devices at my disposal. 

- My Desktop ( Ryzen 5600x, RTX 2080 Ti, 32GB RAM )
- MacBook Pro M1 Pro ( 16 GB )
- NAS ( Ryzen 3700x, GTX 1660 Super, 64 GB RAM )
- Laptop ( Intel 10th Gen, 16 GB, MX 250 Dedicated GPU )
- Mini PC x2 ( Intel 6th Gen, 6400, 8 GB RAM, No Dedicated GPU )

So, I spread the initial load out. During dataset prep, I wrote a script in Go, that ran on all these machines, slowly churning through the data. Each machine was responsible for handling a portion of the data. This is a general view of my data prep pipeline. 

Data Prep:
- Get the data 
- Clean the data ( Remove sensitive, confidential information )
- Reduce semantic duplicates ( Same type of data )
- Increase variety in data 
- Use `nomic-embed-text` to generate embeddings for those as well ( For Upcoming RAG Layer )

Data Generation:
- Run local model on Desktop, Mac and NAS to generate the dataset from the prepped data. ( Llama 3.2 on Desktop and NAS, MLX on Mac )
- Laptop and Mini PCs handled the data prep section of the pipeline

> Semantic deduplication means it removes things that are essentially the same, worded differently. Two successful sales, ordering from the same menu with similar price, we don't need both. Very simplified example. 

> I used Go for the pipeline because Go is the GOAT and anyone who says otherwise needs to take a chill. Also, from a technical perspective, Goroutines, shall I say more?

### The Final Hybrid

Now we have a LoRA adapter, we have embeddings generated from all the data we had. Time to put it to work. 

So I built a small web interface, using FastAPI and RAW CSS ( Do you really need Tailwind for this? ). It presents the user with a chat interface and a help modal that shows what and how. 

So what happens when a user writes a chat message?

> I am bad at making flow charts, so I cheated a little. Used Affine's node system to make this, took a screenshot and posted here. 

![Flow](https://img.sglab.ioritro.com/i/NTMMVffg)

For vector DB, I used Qdrant. I am familiar with it, it's reasonably lightweight. The chunk retrieval ( top-k ) is a mixed bag. On analytical questions it's set to 10, while for knowledge questions it's set to 5. 

There is always a chance that you can't find any relevant data. This is where you have a choice to make. How you reflow the whole chain above, makes a lot of things either easier or harder for you. Here are some questions that you have to answer, 

- Do I broaden the scope of the user query? 
- Do I increase top_k? 
- Be a little bit more creative, play with the temperature? 

These are all good choices if your target is a lot more general. If your target audience is much smaller, you could take my route. If you look at any blog, video or tutorial on fine-tuning or RAG, they sometimes talk about query routers or query transformers. LangChain and LlamaIndex both have router primitives. But I went about it a little differently. 

I used a smaller model, hosted on another machine, to be the query planner ( my name for it ). It takes the user query, before doing anything, it determines a few things, 

- Intent ( What is this request actually asking for? )
- Source Type ( Where can we find data based on the intent? Documentation, Tickets, Business Info or a combination? )
- top_k ( What I talked about earlier )
- Generation Style ( Should it be a list? Brief? Analytical data or knowledge question? )

Then it outputs a structured JSON plan, that then gets embedded into nomic-embed-text and the rest of the process follows.

I have a unique opportunity here that others may not enjoy. It's recursive :D. I used the same fine-tuning approach for a much smaller model, Llama 3.2 1B, running on my NAS, to become the query planner. It understands terminology and process just enough to make the query effective for the larger model.

Now you might ask, why do I need two fine-tuned models? Can't I just do it in one? Very good question. I can, but my whole goal with this is to make sure a user can ask a question and get a very good, quality answer in one go. So I don't have to carry their previous conversation into the next message to keep the context — that's a much bigger undertaking and very low return. 

If I did both in the same model ( LoRA Adapter ), it would require a much larger model or some back and forth to get the result and for business people, they don't wanna wait. Ask any Product Manager, they will tell you. 

### Wait, There Is More

So far, I have told you how to work with data that is essentially stale or sitting somewhere for a while. It's good for knowledge, for explanation. What if you need real-time data to match with the knowledge? 

What if someone asks "Is there any high ticket sale in the last 24 hours?" 

Well, that's a simple SQL query. You can just query that data and find the result. But if you expect someone who works in customer relations or finance to know how to run that query, that's a different problem. 

> I know a lot of finance people work with complex databases, I was just trying to make a point, leave me alone. 

Remember the query planner we just spoke about a few paragraphs ago? It also has a superpower. The power of tool calling. Anticlimactic but super important. 

I have purpose built a few tools, some connect to a database replica, some connect to an API, some connect to a log server. They fill the gap of systemic knowledge vs real-time information. Now they complement each other. The model can fetch real-time data, process it with knowledge from fine-tuning and answer what the user wants. 

The query planner can decide,

"Hey this dude is asking for live data, let's actually call the tool first, get the data, then put that in the context and send to the model". 

The bigger model only sees the final combined data. It's up to the query planner to decide what and how it goes there. 

I also made a SQLator, don't worry, I will explain. I documented every SQL table structure ( SQL dump - obviously ), API endpoint ( Swagger Docs ), log server schema. That documentation was cleaned up and used as fine-tuning data for the query planner — so when it decides to call its tool, it already knows exactly what shape the query needs to be. The name Query Planner makes a lot of sense now, doesn't it? 

So to recap, a fine-tuned 1B model plans the query, decides if and what tools need to be called, what data to retrieve, then assembles the context. It hands it over to the fine-tuned 3B model that speaks the language people in my company can understand. All from a single message. 

### Don't Forget

- If you are connecting to a live database, use a read-only user. Never, ever, ever use a user with write permission. 
- Make sure you have the permission to build something like this. My boss is one of the coolest guys I know, he never says NO to my experiments, but on this one, we both made sure, legally we are clear and with some boundaries. 
- You don't know everyone in your company and how they will use it. Make sure proper audit logs are present — who asked, what they asked, what they got in return. 
- Feedback is important, especially if it can be attached to the message itself. I have a thumbs up and down button on each reply. I can see what the user considered a bad response. I can work on that. 
- Training once isn't a once and done project. Your company will have new features, guidelines, rules and you need to account for those. Some of it can be handled during training for future scope, some needs retraining. ( Unfortunately )
- In your system prompt, set some ground rules. Rule no. 1 of engineering, never trust the user to always do the right thing. ( It applies to everything )
- Make documentation. Someone someday might pick this up for future development and we all hate the `code-as-documentation` dynamic. 

## Conclusion

After reading this, you might have the impression there are a few things I glossed over. That's intentional. This is an internal tool. What it does, with what data and how, is something I don't want to write explicitly. Instead, I wrote the blueprint. Some might ask for some code examples. This post explains things well enough that you can put this in any self-respecting AI model and it should be able to generate the code for you. This is a guide, not a instruction set, treat it as such. You might wanna do things differently or you might find someting better, more power to you. You know what, leave me a comment, let me know what you would've done differently and i will learn something from it.

My goal was to explain what I did, what I did differently and how you could follow through. I did change the base model later on — onto what, let's keep that a secret.