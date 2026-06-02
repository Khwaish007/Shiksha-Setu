import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random
import math

# --- Configuration ---
OUTPUT_DIR = "student_tests_dataset"
NUM_STUDENTS = 20
FONT_PATH = "IndieFlower-Regular.ttf"  # <-- IMPORTANT: CHANGE THIS TO YOUR FONT FILE
FONT_SIZE = 24
IMAGE_WIDTH = 1200
IMAGE_HEIGHT = 1600
BACKGROUND_COLOR = "white"
TEXT_COLOR = "black"

# --- Test Questions ---
QUESTIONS = [
    "1. Solve for x: 3x + 7 = 19",
    "2. Calculate the area of a rectangle with a length of 8 cm and a width of 5 cm.",
    "3. If sin(θ) = 0.5, what is the value of θ in degrees? (Assume 0° <= θ <= 90°)",
    "4. Factorize the quadratic expression: x² + 5x + 6",
    "5. Find the length of the hypotenuse of a right-angled triangle with the other two sides being 6 cm and 8 cm.",
    "6. Find the derivative of f(x) = 4x³ - 2x² + 5.",
    "7. A bag contains 5 red balls and 3 blue balls. What is the probability of drawing a blue ball?",
    "8. Solve the following system of linear equations: 2x + y = 11, x - y = 1",
    "9. Calculate the integral of ∫(3x² + 2x) dx.",
    "10. In a triangle ABC, if side a = 10, sin(A) = 0.5, and sin(B) = 0.8, what is the length of side b?"
]

QUESTION_BANK = [
    {
        "correct": "x = 4",
        "wrong": ["x = 3", "x = 5", "x = 6", "4"]
    },
    {
        "correct": "Area = 40 cm²",
        "wrong": ["Area = 30 cm²", "40", "Area = 48 cm²", "A = 40"]
    },
    {
        "correct": "θ = 30°",
        "wrong": ["θ = 60°", "theta = 30", "30", "θ = 45°"]
    },
    {
        "correct": "(x + 2)(x + 3)",
        "wrong": ["(x + 1)(x + 6)", "x² + 5x + 6", "(x - 2)(x - 3)", "x² + 6x + 5"]
    },
    {
        "correct": "Hypotenuse = 10 cm",
        "wrong": ["Hypotenuse = 9 cm", "10 cm", "Hypotenuse = 8 cm", "c = 12 cm"]
    },
    {
        "correct": "f'(x) = 12x² - 4x",
        "wrong": ["f'(x) = 12x - 4", "12x² + 4x", "f(x) = 12x² - 4x", "8x² - 4x"]
    },
    {
        "correct": "P(blue) = 3/8",
        "wrong": ["P(blue) = 5/8", "3/5", "P(red) = 3/8", "1/2"]
    },
    {
        "correct": "x = 4, y = 3",
        "wrong": ["x = 3, y = 4", "x = 4, y = 4", "x = 5, y = 1", "x = 4"]
    },
    {
        "correct": "x³ + x² + C",
        "wrong": ["x³ + x + C", "3x² + 2x", "x³ + x²", "x² + 2x + C"]
    },
    {
        "correct": "b = 16",
        "wrong": ["b = 14", "b = 18", "16", "b = 10"]
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
    Selects answers from a target score band so the dataset has very high
    variation across low, medium, and high performers.
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
    """Adds random pixel noise to the image."""
    draw = ImageDraw.Draw(image)
    for _ in range(int(image.width * image.height * 0.05)): # 5% noise
        x = random.randint(0, image.width - 1)
        y = random.randint(0, image.height - 1)
        noise_color = (random.randint(200, 255), random.randint(200, 255), random.randint(200, 255))
        draw.point((x, y), fill=noise_color)
    return image

def generate_handwritten_test(student_id, questions, answers, font_path):
    """
    Generates a single handwritten test image for a student.
    """
    # Create a new blank image
    image = Image.new('RGB', (IMAGE_WIDTH, IMAGE_HEIGHT), BACKGROUND_COLOR)
    draw = ImageDraw.Draw(image)

    try:
        font = ImageFont.truetype(font_path, FONT_SIZE)
    except IOError:
        print(f"Error: Font file not found at '{font_path}'.")
        print("Please download a handwriting font (.ttf) and update the FONT_PATH variable.")
        return None

    # --- Write questions and answers to the image ---
    y_text = 50
    
    # Write the student's name on top of the test
    student_name_text = f"Name: Student_{student_id}"
    draw.text((50, y_text), student_name_text, font=font, fill=TEXT_COLOR)
    y_text += 70  # Move down before starting the questions

    for i, question in enumerate(questions):
        # Draw question
        draw.text((50, y_text), question, font=font, fill=TEXT_COLOR)
        y_text += 40  # Move down for the answer

        # Draw answer
        answer_text = f"Ans: {answers[i]}"
        draw.text((70, y_text), answer_text, font=font, fill=TEXT_COLOR)
        y_text += 80 # Move down for the next question

    # --- Apply realistic effects ---
    # 1. Slight rotation
    angle = random.uniform(-1.5, 1.5)
    image = image.rotate(angle, expand=True, fillcolor=BACKGROUND_COLOR)

    # 2. Add noise
    image = add_noise_to_image(image)

    # 3. Slight blur
    blur_radius = random.uniform(0.2, 0.6)
    image = image.filter(ImageFilter.GaussianBlur(blur_radius))

    return image


def main():
    """
    Main function to generate the dataset.
    """
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"Created directory: {OUTPUT_DIR}")

    print("Generating dataset... This may take a few minutes.")

    for i in range(NUM_STUDENTS):
        student_id = i + 1
        print(f"Generating test for student {student_id}/{NUM_STUDENTS}...")

        student_answers = get_student_answers(i)
        test_image = generate_handwritten_test(student_id, QUESTIONS, student_answers, FONT_PATH)

        if test_image:
            # Save the final image
            image_path = os.path.join(OUTPUT_DIR, f"student_{student_id}_test.png")
            test_image.save(image_path)

    print("-" * 30)
    print(f"Dataset generation complete!")
    print(f"{NUM_STUDENTS} test images have been saved in the '{OUTPUT_DIR}' directory.")
    print("-" * 30)
    print("\nNext Steps:")
    print("1. Review the generated images in the 'student_tests_dataset' folder.")
    print("2. You can now use these images as input for your grading application.")


if __name__ == "__main__":
    main()
