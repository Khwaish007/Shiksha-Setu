import os
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

# Define the 9 concepts for which practice tests will be generated
CONCEPTS = [
    'Linear Equations', 
    'Area Calculation', 
    'Trigonometry', 
    'Quadratic Factorization', 
    'Pythagorean Theorem', 
    'Calculus Differentiation', 
    'Probability', 
    'System of Linear Equations', 
    'Calculus Integration'
]

# Define 10 practice questions for each concept
PRACTICE_QUESTIONS = {
    'Linear Equations': [
        {"question": "1. Solve for x: 2x + 5 = 15", "answer": "x = 5"},
        {"question": "2. Solve for y: 3y - 8 = y + 6", "answer": "y = 7"},
        {"question": "3. Find the value of z: 4(z - 2) = 20", "answer": "z = 7"},
        {"question": "4. Solve for a: 5a + 3 = 3a + 9", "answer": "a = 3"},
        {"question": "5. If 2(x + 1) = 10, what is x?", "answer": "x = 4"},
        {"question": "6. Solve for b: b/3 + 2 = 5", "answer": "b = 9"},
        {"question": "7. Solve for c: 7c - 5 = 4c + 10", "answer": "c = 5"},
        {"question": "8. Find x if 10 - 2x = 4", "answer": "x = 3"},
        {"question": "9. Solve for d: (d + 5) / 2 = 7", "answer": "d = 9"},
        {"question": "10. If 3x - 4 = 11, what is the value of x?", "answer": "x = 5"}
    ],
    'Area Calculation': [
        {"question": "1. Area of a rectangle with length 8 and width 5?", "answer": "40"},
        {"question": "2. Area of a circle with radius 7?", "answer": "49π"},
        {"question": "3. Area of a triangle with base 12 and height 6?", "answer": "36"},
        {"question": "4. Area of a square with side length 9?", "answer": "81"},
        {"question": "5. Area of a parallelogram with base 10 and height 5?", "answer": "50"},
        {"question": "6. Area of a trapezoid with bases 6 and 10, and height 4?", "answer": "32"},
        {"question": "7. Area of a circle with diameter 10?", "answer": "25π"},
        {"question": "8. Area of a right triangle with legs 5 and 12?", "answer": "30"},
        {"question": "9. Area of a rectangle with perimeter 30 and length 10?", "answer": "50"},
        {"question": "10. Area of a semicircle with radius 6?", "answer": "18π"}
    ],
    'Trigonometry': [
        {"question": "1. What is sin(30 degrees)?", "answer": "0.5"},
        {"question": "2. What is cos(60 degrees)?", "answer": "0.5"},
        {"question": "3. What is tan(45 degrees)?", "answer": "1"},
        {"question": "4. If sin(x) = 1, what is x in degrees?", "answer": "90 degrees"},
        {"question": "5. If cos(x) = 0, what is x in degrees?", "answer": "90 degrees"},
        {"question": "6. In a right triangle, opposite = 3, adjacent = 4. What is tan(theta)?", "answer": "3/4"},
        {"question": "7. What is the value of sin^2(x) + cos^2(x)?", "answer": "1"},
        {"question": "8. Convert 180 degrees to radians.", "answer": "π radians"},
        {"question": "9. What is the secant of 60 degrees?", "answer": "2"},
        {"question": "10. What is the cosecant of 30 degrees?", "answer": "2"}
    ],
    'Quadratic Factorization': [
        {"question": "1. Factor: x^2 + 6x + 8", "answer": "(x + 2)(x + 4)"},
        {"question": "2. Factor: x^2 - 16", "answer": "(x - 4)(x + 4)"},
        {"question": "3. Solve by factoring: x^2 - 8x + 15 = 0", "answer": "x = 3 or x = 5"},
        {"question": "4. Factor: 2x^2 + 7x + 3", "answer": "(2x + 1)(x + 3)"},
        {"question": "5. Factor: x^2 - x - 12", "answer": "(x - 4)(x + 3)"},
        {"question": "6. Solve: x^2 + 2x - 8 = 0", "answer": "x = 2 or x = -4"},
        {"question": "7. Factor: 3x^2 - 12", "answer": "3(x - 2)(x + 2)"},
        {"question": "8. Factor: x^2 + 10x + 25", "answer": "(x + 5)^2"},
        {"question": "9. Solve: 4x^2 - 9 = 0", "answer": "x = 3/2 or x = -3/2"},
        {"question": "10. Factor: x^2 - 5x - 14", "answer": "(x - 7)(x + 2)"}
    ],
    'Pythagorean Theorem': [
        {"question": "1. Legs are 6 and 8. Hypotenuse?", "answer": "10"},
        {"question": "2. Hypotenuse is 13, one leg is 12. Other leg?", "answer": "5"},
        {"question": "3. Do sides 5, 12, 13 form a right triangle?", "answer": "Yes"},
        {"question": "4. Legs are 8 and 15. Hypotenuse?", "answer": "17"},
        {"question": "5. Hypotenuse is 25, one leg is 7. Other leg?", "answer": "24"},
        {"question": "6. Do sides 7, 9, 12 form a right triangle?", "answer": "No"},
        {"question": "7. A square has a diagonal of length 10. What is the side length?", "answer": "5 * sqrt(2)"},
        {"question": "8. Legs are 9 and 12. Hypotenuse?", "answer": "15"},
        {"question": "9. Hypotenuse is 10, one leg is 6. Other leg?", "answer": "8"},
        {"question": "10. Do sides 2, 3, 4 form a right triangle?", "answer": "No"}
    ],
    'Calculus Differentiation': [
        {"question": "1. Derivative of f(x) = x^4?", "answer": "f'(x) = 4x^3"},
        {"question": "2. Derivative of cos(x)?", "answer": "-sin(x)"},
        {"question": "3. Differentiate y = ln(x).", "answer": "dy/dx = 1/x"},
        {"question": "4. Derivative of f(x) = 5x^3 - 2x + 1?", "answer": "f'(x) = 15x^2 - 2"},
        {"question": "5. Find the derivative of e^(2x).", "answer": "2e^(2x)"},
        {"question": "6. Differentiate y = tan(x).", "answer": "dy/dx = sec^2(x)"},
        {"question": "7. Derivative of sqrt(x)?", "answer": "1 / (2*sqrt(x))"},
        {"question": "8. Using the product rule, find the derivative of x*sin(x).", "answer": "sin(x) + x*cos(x)"},
        {"question": "9. Using the quotient rule, find the derivative of x / (x+1).", "answer": "1 / (x+1)^2"},
        {"question": "10. Derivative of a constant, f(x) = 10?", "answer": "0"}
    ],
    'Probability': [
        {"question": "1. Probability of rolling an even number on a standard die?", "answer": "1/2"},
        {"question": "2. Probability of drawing a king from a deck of 52 cards?", "answer": "4/52 or 1/13"},
        {"question": "3. Two coins are flipped. Probability of getting two heads?", "answer": "1/4"},
        {"question": "4. A bag has 5 red and 3 blue balls. Probability of picking a blue ball?", "answer": "3/8"},
        {"question": "5. Roll two dice. Probability the sum is 7?", "answer": "6/36 or 1/6"},
        {"question": "6. Probability of choosing a vowel from the word 'PROBABILITY'?", "answer": "4/11"},
        {"question": "7. A number is chosen from 1 to 10. Probability it is prime?", "answer": "4/10 or 2/5 (2,3,5,7)"},
        {"question": "8. Probability of drawing a red ace from a deck of cards?", "answer": "2/52 or 1/26"},
        {"question": "9. If P(A) = 0.3 and P(B) = 0.5, and A and B are independent, what is P(A and B)?", "answer": "0.15"},
        {"question": "10. A jar contains 10 marbles, 2 are green. Probability of not picking a green one?", "answer": "8/10 or 4/5"}
    ],
    'System of Linear Equations': [
        {"question": "1. Solve: x + y = 10, x - y = 4", "answer": "x = 7, y = 3"},
        {"question": "2. Solve: 3x + 2y = 16, x + y = 6", "answer": "x = 4, y = 2"},
        {"question": "3. Intersection of y = 3x - 2 and y = x + 4?", "answer": "(3, 7)"},
        {"question": "4. Solve: 2x - y = 5, 3x + y = 5", "answer": "x = 2, y = -1"},
        {"question": "5. Solve: 4x + 3y = 11, 2x - y = 3", "answer": "x = 2, y = 1"},
        {"question": "6. Are the lines y = 2x + 3 and y = 2x - 1 parallel or intersecting?", "answer": "Parallel"},
        {"question": "7. Solve: x = 2y, 3x - 4y = 8", "answer": "x = 8, y = 4"},
        {"question": "8. Solve: 5x - 2y = 10, 3x - y = 7", "answer": "x = 4, y = 5"},
        {"question": "9. Find two numbers whose sum is 15 and difference is 3.", "answer": "9 and 6"},
        {"question": "10. Solve: y = 4x - 1, y = -x + 4", "answer": "(1, 3)"}
    ],
    'Calculus Integration': [
        {"question": "1. Integral of 3x^2 dx?", "answer": "x^3 + C"},
        {"question": "2. Integral of sin(x) dx?", "answer": "-cos(x) + C"},
        {"question": "3. Evaluate the definite integral of 2x from 0 to 3.", "answer": "9"},
        {"question": "4. Integral of e^x dx?", "answer": "e^x + C"},
        {"question": "5. Integral of 1/x dx?", "answer": "ln|x| + C"},
        {"question": "6. Evaluate the integral of 1 from 1 to 5.", "answer": "4"},
        {"question": "7. Integral of sec^2(x) dx?", "answer": "tan(x) + C"},
        {"question": "8. Integral of 4x^3 + 3x^2 dx?", "answer": "x^4 + x^3 + C"},
        {"question": "9. Evaluate the integral of cos(x) from 0 to pi/2.", "answer": "1"},
        {"question": "10. Integral of 5 dx?", "answer": "5x + C"}
    ]
}

def generate_practice_tests_pdf():
    """
    Generates practice test PDF files for each concept.
    """
    output_dir = os.path.join('frontend', 'public', 'practice_tests_pdf')
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    styles = getSampleStyleSheet()
    style_h = styles['h1']
    style_b = styles['BodyText']

    for concept in CONCEPTS:
        filename = f"{concept.replace(' ', '_').lower()}_practice_test.pdf"
        filepath = os.path.join(output_dir, filename)
        
        doc = SimpleDocTemplate(filepath)
        story = []

        story.append(Paragraph(f"Practice Test: {concept}", style_h))
        story.append(Spacer(1, 12))

        questions = PRACTICE_QUESTIONS.get(concept, [])
        for q in questions:
            story.append(Paragraph(q['question'], style_b))
            story.append(Spacer(1, 6))
            story.append(Paragraph(f"Answer: {q['answer']}", style_b))
            story.append(Spacer(1, 12))

        doc.build(story)
        print(f"Successfully created practice test PDF: {filepath}")

if __name__ == "__main__":
    generate_practice_tests_pdf()
