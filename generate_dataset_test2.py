import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random
import math

# --- Configuration ---
OUTPUT_DIR = "student_tests_dataset_2"
NUM_STUDENTS = 20
FONT_PATH = "IndieFlower-Regular.ttf"  # Assumes the font is in the same directory
FONT_SIZE = 24
IMAGE_WIDTH = 1200
IMAGE_HEIGHT = 1600
BACKGROUND_COLOR = "white"
TEXT_COLOR = "black"

# --- Test Questions (Test 2) ---
# Same topics, different numbers
QUESTIONS = [
    "1. Solve for x: 4x - 6 = 18",
    "2. Calculate the area of a rectangle with a length of 12 cm and a width of 4 cm.",
    "3. If cos(θ) = 0.5, what is the value of θ in degrees? (Assume 0° <= θ <= 90°)",
    "4. Factorize the quadratic expression: x² + 7x + 12",
    "5. Find the length of the hypotenuse of a right-angled triangle with sides 5 cm and 12 cm.",
    "6. Find the derivative of f(x) = 2x³ + 3x² - x.",
    "7. A bag contains 4 red balls and 6 blue balls. What is the probability of drawing a red ball?",
    "8. Solve the following system of linear equations: 3x + y = 10, x - y = 2",
    "9. Calculate the integral of ∫(4x³ - 2x) dx.",
    "10. In a triangle ABC, if side a = 12, sin(A) = 0.6, and sin(B) = 0.9, what is the length of side b?"
]

QUESTION_BANK = [
    {
        "correct": "x = 6",
        "wrong": ["x = 5", "x = 8", "x = 4", "6"]
    },
    {
        "correct": "Area = 48 cm²",
        "wrong": ["Area = 40 cm²", "48", "Area = 32 cm²", "A = 48"]
    },
    {
        "correct": "θ = 60°",
        "wrong": ["θ = 30°", "theta = 60", "60", "θ = 45°"]
    },
    {
        "correct": "(x + 3)(x + 4)",
        "wrong": ["(x + 2)(x + 6)", "x² + 7x + 12", "(x - 3)(x - 4)", "x² + 4x + 3"]
    },
    {
        "correct": "Hypotenuse = 13 cm",
        "wrong": ["Hypotenuse = 14 cm", "13 cm", "Hypotenuse = 15 cm", "c = 17 cm"]
    },
    {
        "correct": "f'(x) = 6x² + 6x - 1",
        "wrong": ["f'(x) = 6x² + 6x", "6x² + 6x - 1", "f(x) = 6x² + 6x - 1", "3x² + 2x - 1"]
    },
    {
        "correct": "P(red) = 4/10",
        "wrong": ["P(red) = 6/10", "2/5", "P(blue) = 4/10", "1/2"]
    },
    {
        "correct": "x = 3, y = 1",
        "wrong": ["x = 2, y = 2", "x = 1, y = 3", "x = 4, y = 0", "x = 3"]
    },
    {
        "correct": "x⁴ - x² + C",
        "wrong": ["x⁴ - x + C", "4x³ - 2x", "x⁴ - x²", "x² - x + C"]
    },
    {
        "correct": "b = 18",
        "wrong": ["b = 15", "b = 20", "18", "b = 12"]
    }
]

SCORE_BANDS = [
    {"label": "0-5", "count": 5, "correct_range": (0, 2)},
    {"label": "6-10", "count": 5, "correct_range": (3, 5)},
    {"label": "11-15", "count": 5, "correct_range": (6, 7)},
    {"label": "16-20", "count": 5, "correct_range": (8, 10)}
]

def get_student_answers(student_id):
    """
    Same function as before: uses the zero-indexed offset of the ID
    to consistently place the same student into the same score band
    across all generations.
    """
    band_index = 0
    offset = student_id

    for index, band in enumerate(SCORE_BANDS):
        if offset < band["count"]:
            band_index = index
            break
        offset -= band["count"]

    band = SCORE_BANDS[band_index]
    min_correct, max_correct = band["correct_range"]
    target_correct = random.randint(min_correct, max_correct)

    answers = []
    question_indexes = list(range(len(QUESTION_BANK)))
    random.shuffle(question_indexes)
    correct_indexes = set(question_indexes[:target_correct])

    for question_index, question in enumerate(QUESTION_BANK):
        if question_index in correct_indexes:
            answers.append(question["correct"])
        else:
            answers.append(random.choice(question["wrong"]))

    return answers

def add_noise_to_image(image):
    draw = ImageDraw.Draw(image)
    for _ in range(int(image.width * image.height * 0.05)): 
        x = random.randint(0, image.width - 1)
        y = random.randint(0, image.height - 1)
        noise_color = (random.randint(200, 255), random.randint(200, 255), random.randint(200, 255))
        draw.point((x, y), fill=noise_color)
    return image

def generate_handwritten_test(student_id, questions, answers, font_path):
    image = Image.new('RGB', (IMAGE_WIDTH, IMAGE_HEIGHT), BACKGROUND_COLOR)
    draw = ImageDraw.Draw(image)

    try:
        font = ImageFont.truetype(font_path, FONT_SIZE)
        large_font = ImageFont.truetype(font_path, FONT_SIZE + 10) # Larger font to make name extraction foolproof
    except IOError:
        print(f"Error: Font file not found at '{font_path}'.")
        return None

    y_text = 50
    # Print the name much larger and clearer so Gemini reliably extracts it
    student_name_text = f"Name: student_{student_id}"
    draw.text((50, y_text), student_name_text, font=large_font, fill=TEXT_COLOR)
    y_text += 80

    for i, question in enumerate(questions):
        # Draw question
        draw.text((50, y_text), question, font=font, fill=TEXT_COLOR)
        y_text += 40

        # Draw answer
        answer_text = f"Ans: {answers[i]}"
        draw.text((70, y_text), answer_text, font=font, fill=TEXT_COLOR)
        y_text += 80

    angle = random.uniform(-1.5, 1.5)
    image = image.rotate(angle, expand=True, fillcolor=BACKGROUND_COLOR)

    image = add_noise_to_image(image)

    blur_radius = random.uniform(0.2, 0.6)
    image = image.filter(ImageFilter.GaussianBlur(blur_radius))

    return image

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"Created directory: {OUTPUT_DIR}")

    print("Generating dataset... This may take a few minutes.")

    for i in range(NUM_STUDENTS):
        student_id = i + 1
        print(f"Generating test 2 for student {student_id}/{NUM_STUDENTS}...")

        student_answers = get_student_answers(i) # 0-indexed passed here matches exact bands as script 1
        test_image = generate_handwritten_test(student_id, QUESTIONS, student_answers, FONT_PATH)

        if test_image:
            image_path = os.path.join(OUTPUT_DIR, f"student_{student_id}_test2.png")
            test_image.save(image_path)

    print("-" * 30)
    print(f"Dataset generation complete!")
    print(f"{NUM_STUDENTS} test images have been saved in the '{OUTPUT_DIR}' directory.")

if __name__ == "__main__":
    main()
