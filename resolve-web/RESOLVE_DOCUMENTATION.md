# "Resolve" — Case & Workflow Operations Console

Welcome to the documentation for **Resolve**, an internal tool designed to make managing workflows and operational cases as simple and visually appealing as possible!

This document explains what the project is, how it works, and everything you can do with it in plain, easy-to-understand language.

---

## 1. What is Resolve?

At its core, **Resolve** is an operations console. It helps teams design step-by-step processes (called **Workflows**) and then track individual instances of those processes (called **Cases**).

Imagine a company that needs to handle "Payment Disputes". 
1. First, they create a **Workflow** that outlines the exact steps needed to resolve a dispute (e.g., *Intake -> Finance Review -> Close*). 
2. Whenever a new dispute happens, they create a **Case** that runs on that specific Workflow. The system then guides the user through the exact steps that need to be completed.

**Key Rule:** Resolve is a pure "front-end" application. This means there is no central database or complex server running behind the scenes. Everything you do is saved directly to your browser's local storage. This makes the app incredibly fast and completely private to your machine.

---

## 2. Key Concepts

### Workflows
A Workflow is a blueprint. It defines a set of rules and steps.
- **Stages:** Every workflow is divided into "Stages" (like levels in a video game). For example, a stage might be "Assigned to Investigator".
- **Nodes (Tasks and Gates):** Inside each stage, you have actionable items called nodes.
  - **Tasks:** A normal to-do item (e.g., "Collect evidence logs").
  - **Approval Gates:** A mandatory sign-off point (e.g., "Manager approval").
  - **Sub-tasks:** Tasks can be nested inside other tasks to create a detailed hierarchy.

### Cases
A Case is a living, breathing instance of a Workflow. 
- When you create a case, it starts at the first stage of the workflow.
- It has details like a unique ID (`CASE-2041`), a Title, an Owner, a Priority (High/Medium/Low), and a Status (Open, In Review, Blocked, Resolved).
- As you complete tasks and pass approval gates, you progress the case through its workflow stages until it is fully resolved.

---

## 3. Main Features

### 🏢 The Workspace (Sidebar Navigation)
The app features a frosted-glass sidebar on the left that lets you navigate between your main areas: **Workflows** and **Cases**. It also gives you a quick snapshot of how many active workflows you have and how many cases are waiting for approval.

### 🛠️ The Workflow Builder
This is where the magic happens. You can:
- **List Workflows:** See all your workflows (Active, Draft, or Archived) and quick stats on how many tasks they contain.
- **Create & Edit:** Give a workflow a name and description.
- **The Visual Conveyor:** Once you open a workflow, you see a horizontal "Conveyor" strip that shows the stages connected by lines, visualizing the journey.
- **Manage Stages & Nodes:** You can add new stages, rearrange them, and add tasks or approval gates inside them. You can even nest tasks inside each other infinitely!

### 📂 The Case Manager
This is where you execute the daily work. You can:
- **List Cases:** See a clean list of all ongoing operations, complete with colorful tags showing their status and priority.
- **Track Progress:** When you open a specific case, you see its current stage highlighted on the conveyor belt.
- **Checklist:** Below the conveyor, you see the tasks for the *current* stage. You can click them to check them off. Tasks get a nice solid checkmark, while approvals turn into green check badges.
- **Move Forward:** Once a stage is done, you can click "Next stage" to advance the case along the workflow.
- **Edit Details:** Easily reassign owners, change priorities, or update the case's status (e.g., marking it as "Blocked" if you're waiting on someone).

---

## 4. Under the Hood (Tech Stack)

Even though it's simple to use, Resolve is built on cutting-edge, modern web technologies:

- **React 19 & TanStack Start:** The latest and greatest tools for building interactive user interfaces and handling page routing (moving from one page to another without refreshing).
- **Vite:** An ultra-fast build tool that makes the app load instantly during development.
- **Tailwind CSS v4:** A styling system that allows us to build beautiful designs directly in the code without writing traditional CSS files.
- **Local Storage Store:** Instead of a complex backend database, a custom "React Context" system automatically saves every click, edit, and checkmark directly into your browser using `localStorage`. If you close the tab and come back tomorrow, everything will be exactly as you left it.

---

## 5. The Design System ("Frosted Console")

Resolve doesn't look like a boring spreadsheet. It's designed to wow users and feel like a state-of-the-art command center:
- **Backgrounds:** Soft, blurred, glowing colorful orbs float behind a clean, white-gray canvas.
- **Glassmorphism:** Elements like the sidebar and cards look like frosted glass (blurring what's behind them) to give a sense of depth.
- **Animations:** Everything feels alive. When you open a page, elements "rise" smoothly into place. Interactions like hovering over buttons reveal hidden actions smoothly.
- **Typography:** Uses premium fonts (Inter for normal text, JetBrains Mono for small technical labels) to strike a balance between friendly and professional.

---

## Summary
Resolve is a highly visual, completely local, front-end-only application that takes the complexity out of designing custom business processes and turns tracking them into an engaging, beautiful experience.
