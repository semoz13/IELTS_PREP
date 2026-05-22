# feedback.py
import os
import json
import re
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()
client = Anthropic()

def get_feedback(
    essay: str,
    scores: dict,
    task_type: str = "task1",
    image_description: str = None,  # Task 1 only
    prompt: str = None              # Task 2 only
) -> dict:
    """
    Takes an essay and 5 scores from DistilBERT,
    sends them to Claude, returns structured student-friendly feedback.

    Args:
        essay             : The student's essay as a string
        scores            : Dict with keys: task_achievement, coherence_cohesion,
                            lexical_resource, grammar, overall (0-9 scale)
        task_type         : "task1" or "task2"
        image_description : Description of the chart (Task 1 only)
        prompt            : The essay question (Task 2 only)

    Returns:
        Dict with feedback for each dimension + overall comment
    """

    if task_type == "task1":
        # Build context section for Task 1
        if image_description:
            context = f"""
--- CHART DESCRIPTION ---
{image_description}
"""
        else:
            context = ""

        task_label = "Task 1 (Academic – Chart/Graph Description)"
        task_instruction = "The student was asked to describe a chart or graph. Use the chart description above to check if the student interpreted the data correctly."

    else:
        # Build context section for Task 2
        if prompt:
            context = f"""
--- ESSAY QUESTION ---
{prompt}
"""
        else:
            context = ""

        task_label = "Task 2 (Opinion/Discussion Essay)"
        task_instruction = "The student was asked to write an opinion essay. Use the essay question above to check if the student answered the question properly."

    full_prompt = f"""
You are an expert IELTS examiner and a friendly English tutor.
Give feedback on this IELTS {task_label} essay.
Write in simple English — the student may not be a native speaker.
Be specific and encouraging. Always give one concrete example of improvement.

{context}
--- STUDENT ESSAY ---
{essay}

--- PREDICTED SCORES (out of 9) ---
Task Achievement:      {scores['task_achievement']:.1f}
Coherence & Cohesion:  {scores['coherence_cohesion']:.1f}
Lexical Resource:      {scores['lexical_resource']:.1f}
Grammar:               {scores['grammar']:.1f}
Overall Band Score:    {scores['overall']:.1f}

{task_instruction}

For EACH of the 4 rubric dimensions write feedback with exactly:
1. "strength"  — one thing the student did well (1-2 sentences)
2. "weakness"  — one specific thing to improve (1-2 sentences)
3. "example"   — rewrite one weak sentence from the essay to show improvement

Also write "overall_comment" — 2 sentences of encouragement.

Reply ONLY with this exact JSON format, no extra text:
{{
  "task_achievement": {{
    "strength": "...",
    "weakness": "...",
    "example": "..."
  }},
  "coherence_cohesion": {{
    "strength": "...",
    "weakness": "...",
    "example": "..."
  }},
  "lexical_resource": {{
    "strength": "...",
    "weakness": "...",
    "example": "..."
  }},
  "grammar": {{
    "strength": "...",
    "weakness": "...",
    "example": "..."
  }},
  "overall_comment": "..."
}}
"""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1000,
        messages=[
            {"role": "user", "content": full_prompt}
        ]
    )

    raw_text = response.content[0].text

    try:
        feedback = json.loads(raw_text)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if match:
            feedback = json.loads(match.group())
        else:
            raise ValueError(f"Unexpected response format:\n{raw_text}")

    return feedback


# ── Quick tests ───────────────────────────────────────────────────────────────
if __name__ == "__main__":

    # Test Task 1 — with image description
    print("=" * 50)
    print("TEST 1 — Task 1 with image description")
    print("=" * 50)

    task1_essay = """
    The chart shows the percentage of people using the internet in three countries
    from 2000 to 2020. Overall, internet usage increased in all three countries.
    In 2000, the usage was low in all countries. By 2020, it rise significantly.
    Country A had the highest usage throughout. Country B and C was lower.
    """

    task1_scores = {
        "task_achievement": 5.5,
        "coherence_cohesion": 5.0,
        "lexical_resource": 5.5,
        "grammar": 4.5,
        "overall": 5.0
    }

    task1_image_desc = """
    The image depicts a line graph showing internet usage percentage in Country A,
    Country B, and Country C from 2000 to 2020. Country A started at 20% in 2000
    and reached 80% by 2020. Country B started at 10% and reached 60% by 2020.
    Country C started at 5% and reached 50% by 2020.
    """

    result1 = get_feedback(
        essay=task1_essay,
        scores=task1_scores,
        task_type="task1",
        image_description=task1_image_desc
    )
    print(json.dumps(result1, indent=2))

    # Test Task 2 — with prompt
    print()
    print("=" * 50)
    print("TEST 2 — Task 2 with essay question")
    print("=" * 50)

    task2_essay = """
    Nowadays many people think that technology is good for us.
    I agree with this statement because technology help us communicate.
    We can talk to friends and family far away. Also technology make our
    life easier. In conclusion technology is very important in modern life.
    """

    task2_scores = {
        "task_achievement": 4.5,
        "coherence_cohesion": 4.0,
        "lexical_resource": 4.5,
        "grammar": 4.0,
        "overall": 4.5
    }

    task2_prompt = """
    Some people believe that technology has made our lives better,
    while others think it has made our lives worse.
    Discuss both views and give your own opinion.
    """

    result2 = get_feedback(
        essay=task2_essay,
        scores=task2_scores,
        task_type="task2",
        prompt=task2_prompt
    )
    print(json.dumps(result2, indent=2))
    