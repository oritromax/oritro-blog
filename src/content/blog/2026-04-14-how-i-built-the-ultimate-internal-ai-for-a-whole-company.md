---
title: How i built the ultimate internal AI for a whole company
date: 2026-04-14 12:52:35
tags:
    - ai
    - llm
    - fine-tuning
    - rag
    - mcp
categories:
    - ai
description: Before you think this as another TechBro pitching his new AI Startup, its not. I am gonna go into a lot of technical details, so if thats your thing, read on. 
---

## The Problem

The modern software engineering and the corporate industry that relays on that, is built on a few key component. People, Lots of coffee, jira ( or other task management tool, if you hate how slow jira is ) and lots and lots of documentation. 

At first, it all seems to fit nicely in a well-oiled machine. Everyone is working togather, building a system from the ground up, solving problems, writing tickets and specs. It goes well for the honeymon period. 

Then talents move away. Software Engineers go to other places, their knowledge of a massive system can't be properly fit into a few confluence pages. Product designers move on, their intention and process behind something is summarized, losing its essense. Product managers move on, with them goes smaller but crucial details, why was a certain decision was made that changed a small but important part of the product. 

Now these knowledges are written somewhere, maybe in chat, or a group call that was never recorded or hopefully in the comment or body of a ticket. 

Now new members are coming in, they need to understand the system, the product, the process. The 20 confluence pages you have written for this very purpose, has not been maintained or updated with what was chanced since it was written. It provides valuable context, but thats a 10000 ft overview. It doesn't tell you the datatype of a variable, it just tells you, it exists. 

And if a company has been running for over a few years, this becomes a different kinds of nightmare. Plus, if you have publicly accessable product ( A SaaS or HID or IoT) thats even worse. Now you have so many issues, complaints, tickets, its almost impossible to figure out why something was changed 3 years ago, unless you know the very specific thing to look for. 

Thats a lot of context, so lets get to the __meat__ of the discussion. 

## The Approach

### The 'RAG' Approach

My first approach was, lets build a RAG. Retrival Augmented Generation. Put a regular llm model behind it, add context based on what was asked and wham bam done ( I don't know where i heard this phrase first, but its stuck in my head and i use it way to much.)

Before i started the POC for this, i started to note down how this will go and certain things started to appear problematic. The LLM model has context, some data we shoved down its throat, but without the actual knowledge of that data's purpose, its not gonna be able to do anything useful. It will provide results for sure, hundreds of thousands of companies are doing that. But due to the nature of our business, the data itself is not enough. Understanding what the data means, is also important. 

Now i can simply have a instruction set in the master prompt about explanation of the data and the LLM should be able to make sense of it, right? 

For 90% of it, yes. But the other 10% is where it there are overlapping business decisions, which got changed over the years and no longer valid, will also be picked up by a semantic search. And yes i know, i can handle the weight by setting priorities of dates and stuff, i will get there later. 

### The 'Fine-tuning' Approach

Fine-tuning a model means, you start with a base model, teach it important concepts and patterns, so it can provide you results that aligns with your requirements. You don't need to train a new model from scratch. 

Thus, my journey into fine-tuning began. Now before this point, i have only dabbled into fine tuning, using Phi-3. Because thats the only model i could realisticly fine-tune with my 2080-ti without resorting to corner cutting. 

So this time, i thought, why not try that approach? 

Fine-tuning a model requires three things.

- A base model as the foundation
- Enough vRAM to run the training 
- A well-organized dataset

The dataset is extremely important here. Patterns, knowledge, concept is far more important than dumping a bunch of data and calling it a day. Quality is the key, not quantity. 

#### Knowledge and Concepts

So what actually goes into the dataset? That depends on what you wanna teach it. 

Lets say you have a machine, that works as a POS. How that machine works, that knowledge is important for fine-tuning. What sales that machine have generated, not so much. A few hundreds sample of sales data will help the fine-tuning process to understand what it actually need to understand sales data, thats about it. If you wanna detect anomolies or weird perceived behavior, you can add a few thousand, but the whole sales database doesn't make any sense. The model only needs to know how to understand the sales data. 

Same goes for any existing documentation you have. Confluence or similar note taking apps have properly documented structure, so that shouldn't be that difficult. But what you need to tech the model is, what is unique or specific to your company. How do you document stuff? How do you report an incident? How do you write a new feature spec? How do you write the resolution of a major bug? Example of those goes into fine-tuning. 

Next is key business concepts. We all know what some industry term means. QR code is QR code, nobody ( a sane person ) will use this specifc word for anything else. But every company has internal terms, product name, product behavior, logics, structure, rules that is unique to that company ( or important ). Those goes into fine-tuning. 


#### Data Prep 

As mentioned earlier, Quality data is king here. Your dataset is a collection of instruction-response pairs. You need to prepare it based on what you are trying to teach the model. For example,

```
date: 2022-03-15, rep: John, region: SE, product: SKU-4421, qty: 12, revenue: 4800, discount: 10%
```
This is a example row of a sale. On itself, the LLM could make some suggestion based on the data, but that won't help you in most cases. It doesn't know what you want from this data. So we create a pair, 

```
{
  "instruction": "Summarize this sales transaction.",
  "input": "Date: 2022-03-15 | Rep: John | Region: Southeast | Product: SKU-4421 | Qty: 12 | Revenue: $4800 | Discount: 10%",
  "output": "John closed a mid-size deal in the Southeast region on March 15, 2022, selling 12 units of SKU-4421 for $4,800 with a 10% discount applied."
}
```
Each pair is a JSON object. Your full dataset is a JSONL file — one pair per line. Now this JSON pair, tells the model, this is what you will be asked, and this is how you should respond ( A very simplified way of putting it ). 

__Do i have to do this manually?__

If your data is well structured, like pulling from a SQL database, you can automate the pair generation programatically. If its not structured, you can use a larger LLM to generate them for you. One important note here, if your dataset contains sensitive or confidential information, might not be a good idea to use a third party model. Check with your companies policy or legal team on this. Running this generation using a locally running open source model might be a good idea in that case, although it will take considerably more time. 

#### The Training

I am using [unsloth](https://unsloth.ai/) for the training. Its more memory efficient, its attention implementations are very optimized. Its free for a single-GPU setup, which i technically have. Plus some other shananigans i pulled. I will go over it shortly. 

I am going qith QLoRA. What it is and how it works, is beyond the scope of this post. A very summarized version is, instead of updating every single weight in the base model, it freezes the base model, then inserts LoRA Adapters ( trainable matrices ) into specific layers. Plus it adds 4-bit quantization, so that cuts vRAM usage by a lot. 

For my specific setup, the parameters that matters, written in plain text. 

```
load_in_4bit // base model to 4bit - save vRAM
r = 16 // Lora Rank
lora_alpha = 16 // I found best result when set to same as lora rank
max_seq_length = 2048 // default
per_device_train_batch_size = 2 
gradient_accumulation_steps = 4
num_train_epoch = 3
learning_rate = 2e-4
```

Again this is my setup, you might have to adjust this. One important note, I initially set this up for my 1660 Super OC Edition. 6 GB vRAM, later moved to my desktop which has a 2080ti - 11 GB vRAM, so some adjustment were made later. This is a somewhat safe default. 

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

> One very important thing during traning, watch your eval loss. At some point it would drop and become steady, plateau. If your train loss keeping going down but eval loss doesn't or starts raising, it could mean your are over fitting. You should stop. 

#### The shenanigans

I do have a few devices in my disposal. 

- My Desktop ( Ryzen 5600x , RTX 2080 ti, 32GB RAM)
- Macbook Pro M1 Pro ( 16 GB )
- NAS ( Ryzen 3700x, GTX 1660 Super, 64 GB RAM)
- Laptop ( Intel 10th Gen, 16 GB, MX 250 Dedicated GPU)
- Mini PC X 2 ( Intel 6th Gen, 6400, 8 GB RAM, No Dedicated GPU )

So, i spread the initial load out. During dataset prep, i wrote a script in Go, that ran on all these machines, slowly churning through the data. Each machine was responsible for handling portion of the data. This is a general view of my data prep pipeline 

Data Prep:
- Get the data 
- Clean the data ( Remove sensitive, confidential information)
- Reduce semantic duplicates ( Same type of data )
- Increase variaty in data 
- Use `nomic-embed-text` to generate embedding for those as well ( For Upcoming RAG Layer )

Data generation:
- Run local model on Desktop, Mac and NAS to generate the dataset from the preped data. ( Llama 3.2 on Desktop and NAS, MLX on Mac)
- Laptop and Mini PCs handled the data prep section of the pipeline

> Semantic deduplication means it removes things that are essentially the same, worded different. Two successful sales, ordering from the same menu with similar price, we don't need both. Very simplified example. 


> I used go for the pipeline because Go is the GOAT and anyone says otherwise needs to take a chill. Also, from a technical perspective, Goroutine, shall i say more?

### The Final Hybrid

Now we have a LoRA adapter, we have embeds generated from all the data we had. Time to put it to work. 

So i built a small web interface, using FastAPI and RAW CSS ( Do you really need tailwind for this? ). It presents the user with a chat interface and a help modal that shows what and how. 

So what happens when a user writes a chat message?

> I am bad at making flow charts, so i cheated a little. Used affine's node system to make this, took a screenshot and posted here. 

![Flow](https://img.sglab.ioritro.com/i/NTMMVffg)

For vector DB, i used Qdrant. I am familier with it, its reasonably lightweight. The chunk retrival ( top-k ) is a mixed bag. On Analytical question its set to 10, while for knowledge questions its set to 5. 

There is always a chance that you can't find any relevant data. This is where you have a choice to make. How you reflow the whole chain above, makes a lot of things either easier or harder for you. Here are some questions that you have to answer, 

- Do i broaden the scope of user query? 
- Do i increase top_k? 
- Be a little bit more creative, play with the temperature? 

These are all good choices if your target is a lot more geenral. If your target audiance is much smaller, you could take my route. If you look at any blog, video or tutorial on Fine-tuning or rag, they sometimes talk about query router or query transformer. LangChain and LlamaIndex index both have router primitives. But i went about it a little differently. 

I used a smaller model, hosted on another machine, to be the query planner ( My name for it ). It takes the user query, before doing anything, it determines a few things, 

- Intent ( What this request is actually asking for? )
- Source Type ( Where can we find data based on the intent? Documentation, Tickets, Business Info or a combination? )
- tok_k ( What i talked about earlier )
- Generation Style ( Should it be a list? Brief? Analytical data or Knowledge question? )

Then it outputs a structured json plan, that then goes to be embeded into nomic-embed-text and the rest of the process follows.

I have a unique oppertunity here that other may not enjoy. Its recursive :D. I used the same fine-tune approach for a much smaller model, Llama3.2:1b, running on my NAS, to become the query planner. It understand terminology and process just enough to make the query effective for the larger model.

Now you might ask, why do i need two fine-tuned model? can't i just do it in one? Very good question. I can, but in those cases, but My whole goal with this is to make sure, user can ask a question and get a very good and qualitive answer in one go. So i don't have to compact their previous conversation into the next message to keep the context, that a much bigger undertaking and very low return. 

If i did both in the same model ( LoRA Adapter ), it would require a much larger model or some back and forth to get the result and for business people, they don't wanna wait. Ask any Product manager, they will tell you. 

### Wait, there is more

So far, i have told you how to work with data that is essentially stale or sitting somewhere for a while. Its good for knowledge, for explanation. What if you need realtime data to match with the knowledge? 

What if someone asks "Is there any high ticket sale in the last 24 hour?" 

Well, thats a simple SQL Query. You can just query that data and find the result. But if you expect someone who works in customer relation or finance to know how to run that query, thats a different problem. 

> I know a lot of finance people work with complex databases, i was just trying to make a point, leave me alone. 

Remember the query planner we just spoke about a few paragraph ago? it also have a super power. The power of tool calling. Anti-climactic but super important. 

I have purpose built a few tools, some connects to a database replica, some connects to a api, some connects to log server. They fill the gap of systemic knowledge vs real time information. Now the complement each other, The model can fetch real time data, process it with knowledge from fine-tuning and answer what the user wants. 

The Query planner can decide,

"Hey this dude is asking for live data, lets actually call the tool first, get the data, then put that in the context and send to the model". 

The bigger model only sees the final combined data. Its upto the query planner to decide what and how it goes there. 

I also made a SQLator, don't worry, i will explation. I documented every SQL table strcuture ( SQL dump - Obviously), API endpoint ( Swagger Docs ), log server schema. That documentation was cleaned up and used as a fine tuning data for the query planner - so when it decides to call it tool, it already knows exactly what shape the query needs to be. The name Query Planner makes a lot of sense now, doesn't it? 

So to recap, a fine-tuned 1b model plans the query, decides if and what tools needs to be called, what data to retrieve, then assembles the context. Hands it over to the fine-tuned 3B model that speaks the language people in my company can understand. All from a single message. 

### Don't forget

- If you are connecting to a live database, use a readonly user. Never, ever, ever, use a user with write permission. 
- Make sure you have the permission to build something like this. My boss is one of the coolest guy i know, he never says NO to my experiments, but on this one, we both made sure, legally we are clear and with some boundaries. 
- You don't know everyone in your company and how they will use it. Make sure proper audit logs are present, who asked, what they asked, what they got in return. 
- Feedbacks are important, especially if they can be attached to the message itself. I have a thumbs up and down button to each reply. I can see what the user considered a bad response. I can work on that. 
- Training once isn't a once and done project. Your company will have new features, guidelines, rules and you need to account for those. Some of it can be handled during training for future scope, some needs retraining. ( Unfortunately )
- In your system prompt, set some ground rule. Rule no 1 of engineering, never trust the user to always do the right thing. ( Its applies to everything )
- Make documentation. Someone someday might pick this up for future development and we all hate the `code-as-documentation` dynamic. 

## Conclusion

After reading this, you might have the impression, there are a few things i glossed over. Thats intentional. This is an internal tool. What it does, with what data and how is something i don't wanna write explicitely. Instead, i wrote the blueprint. Some might ask for some code example. This post explains this well enough, that you can put this in any self respecting AI model and it should be able to generate the code for you. 

My goal was to explain what i did, did differently and how you could follow through. I did change the base model later on, onto what, lets keep that a secret. 