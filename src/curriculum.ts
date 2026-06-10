import { Curriculum } from './types';

export const curriculumData: Curriculum = {
  primary: [
    { 
      grade: 'Grade 1', 
      subjects: [
        { name: 'Mathematics', topics: [
          { id: 'p1_m1', title: 'Counting to 20', description: 'Basic number recognition and sequence', grade: 'Grade 1', subject: 'Mathematics', learningObjectives: ['Count to 20', 'Match digits to quantities'], keyVocabulary: [{ term: 'Number', definition: 'A mathematical value representing quantity' }, { term: 'Count', definition: 'To determine the total of items' }], curriculumStandards: [] },
          { id: 'p1_m2', title: 'Simple Addition', description: 'Adding using physical objects', grade: 'Grade 1', subject: 'Mathematics', learningObjectives: ['Solve 1+1 type problems'], keyVocabulary: [{ term: 'Addition', definition: 'Joining two groups of objects' }, { term: 'Sum', definition: 'The total amount of numbers added' }], curriculumStandards: [] },
          { id: 'p1_m3', title: 'Basic Shapes', description: 'Circles, Squares, and Triangles', grade: 'Grade 1', subject: 'Mathematics', learningObjectives: ['Identify shapes in environment'], keyVocabulary: [{ term: 'Circle', definition: 'A round shape with no corners' }, { term: 'Square', definition: 'A flat shape with four equal sides' }], curriculumStandards: [] },
          { id: 'p1_m4', title: 'Skip Counting by 2s and 5s', description: 'Basic sequences and step counts', grade: 'Grade 1', subject: 'Mathematics', learningObjectives: ['State sequence steps of 2s and 5s'], keyVocabulary: [{ term: 'Skip Count', definition: 'Counting by active intervals other than ones' }] }
        ] },
        { name: 'English', topics: [
          { id: 'p1_e1', title: 'Alphabet Phonics', description: 'Sounds of every letter', grade: 'Grade 1', subject: 'English', learningObjectives: ['Recognize all letter sounds'], keyVocabulary: [{ term: 'Phonics', definition: 'Sounds connected to alphabet letters' }, { term: 'Letter', definition: 'A symbol representing a spoken sound' }], curriculumStandards: [] },
          { id: 'p1_e2', title: 'Sight Words', description: 'High-frequency words like "the", "and"', grade: 'Grade 1', subject: 'English', learningObjectives: ['Read 10 sight words'], keyVocabulary: [{ term: 'Sight Word', definition: 'A common word recognized instantly' }], curriculumStandards: [] },
          { id: 'p1_e3', title: 'Action Verbs for Beginners', description: 'Simple doing words in everyday activities', grade: 'Grade 1', subject: 'English', learningObjectives: ['Match simple actions to doing words'], keyVocabulary: [{ term: 'Action Word', definition: 'A word depicting active performance' }] },
          { id: 'p1_e4', title: 'Simple Sentence Builders', description: 'Creating basic Subject-Verb-Object structures', grade: 'Grade 1', subject: 'English', learningObjectives: ['Put basic words into readable patterns'], keyVocabulary: [{ term: 'Sentence', definition: 'A structured collection of words conveying a thought' }] }
        ] },
        { name: 'Sesotho', topics: [
          { id: 'p1_s1', title: 'Ditiso tsa Letsatsi', description: 'Daily greetings in Sesotho', grade: 'Grade 1', subject: 'Sesotho', learningObjectives: ['Greeting family members correctly'], keyVocabulary: [{ term: 'Lumela', definition: 'Hello in Sesotho' }, { term: 'Khotso', definition: 'Peace, used as a respectful greeting' }], curriculumStandards: [] },
          { id: 'p1_s2', title: 'Balapa Laka', description: 'Family members and roles', grade: 'Grade 1', subject: 'Sesotho', learningObjectives: ['Name family members in Sesotho'], keyVocabulary: [{ term: 'Ntate', definition: 'Father' }, { term: 'Mme', definition: 'Mother' }, { term: 'Abuti', definition: 'Brother' }], curriculumStandards: [] },
          { id: 'p1_s3', title: 'Lilemo le Dikolong', description: 'Basotho seasons and school greetings', grade: 'Grade 1', subject: 'Sesotho', learningObjectives: ['Name three basic school activities'], keyVocabulary: [{ term: 'Sekolo', definition: 'School' }] },
          { id: 'p1_s4', title: 'Mmele le Dikaro', description: 'Learning basic human anatomy terms in Sesotho', grade: 'Grade 1', subject: 'Sesotho', learningObjectives: ['Identify head, hands, and feet in Sesotho'], keyVocabulary: [{ term: 'Mohlolo', definition: 'Body structure' }] }
        ] },
        { name: 'Natural Science', topics: [
          { id: 'p1_n1', title: 'The Five Senses', description: 'Sight, sound, smell, taste, touch', grade: 'Grade 1', subject: 'Natural Science', learningObjectives: ['Identify organ for each sense'], keyVocabulary: [{ term: 'Sense', definition: 'How our body perceives things' }, { term: 'Organ', definition: 'A specialized body part like eye or ear' }], curriculumStandards: [] },
          { id: 'p1_n2', title: 'Plants and Seeds', description: 'Undergirding roots and seeding growth', grade: 'Grade 1', subject: 'Natural Science', learningObjectives: ['Name three basic plant structures'], keyVocabulary: [{ term: 'Seed', definition: 'Small object from which a wildflower or tree sprouts' }] },
          { id: 'p1_n3', title: 'Animals in Lesotho', description: 'Locating domestic and wild animals', grade: 'Grade 1', subject: 'Natural Science', learningObjectives: ['Differentiate pets from wild species'], keyVocabulary: [{ term: 'Domestic', definition: 'Tamed or farm-bred animals living with humans' }] }
        ] },
        { name: 'Social Sciences', topics: [
          { id: 'p1_ss1', title: 'My Family Home', description: 'Different family structures and homes', grade: 'Grade 1', subject: 'Social Sciences', learningObjectives: ['Describe your home environment'], keyVocabulary: [{ term: 'Family', definition: 'A group of related people' }, { term: 'Home', definition: 'A place where people live together' }], curriculumStandards: [] },
          { id: 'p1_ss2', title: 'School Helpers', description: 'Identifying roles of principal, gatekeepers, and staff', grade: 'Grade 1', subject: 'Social Sciences', learningObjectives: ['Acknowledge staff duties at school'], keyVocabulary: [{ term: 'Principal', definition: 'The academic leader of a school' }] },
          { id: 'p1_ss3', title: 'My Village and Landmarks', description: 'Recognizing local roads, rivers, and mountains', grade: 'Grade 1', subject: 'Social Sciences', learningObjectives: ['Identify standard geographical boundaries around home'], keyVocabulary: [{ term: 'Village', definition: 'A small rural settlement of houses' }] }
        ] },
        { name: 'Life Skills', topics: [
          { id: 'p1_l1', title: 'Personal Safety', description: 'Recognizing danger and safe spaces', grade: 'Grade 1', subject: 'Life Skills', learningObjectives: ['Identify safe places at school'], keyVocabulary: [{ term: 'Safety', definition: 'Being free from danger or harm' }], curriculumStandards: [] },
          { id: 'p1_l2', title: 'Healthy Daily Habits', description: 'Washing hands and physical exercise routines', grade: 'Grade 1', subject: 'Life Skills', learningObjectives: ['State when to wash family dishes or hands'], keyVocabulary: [{ term: 'Hygiene', definition: 'Healthy habits to avoid illness' }] },
          { id: 'p1_l3', title: 'Manners and Cooperation', description: 'sharing resources and saying please/thank you', grade: 'Grade 1', subject: 'Life Skills', learningObjectives: ['Recognize helpful sharing phrases'], keyVocabulary: [{ term: 'Respect', definition: 'Caring for other peers thoughts' }] }
        ] }
      ] 
    },
    { 
      grade: 'Grade 2', 
      subjects: [
        { name: 'Mathematics', topics: [
          { id: 'p2_m1', title: 'Place Value Basics', description: 'Tens and units of 2-digit numbers', grade: 'Grade 2', subject: 'Mathematics', learningObjectives: ['Identify tens and units'], keyVocabulary: [{ term: 'Tens', definition: 'Group of ten individual units' }, { term: 'Units', definition: 'Single-digit values from zero to nine' }], curriculumStandards: [] },
          { id: 'p2_m2', title: 'Subtraction within 20', description: 'Methods for subtracting values smoothly', grade: 'Grade 2', subject: 'Mathematics', learningObjectives: ['Subtract within 20 with blocks'], keyVocabulary: [{ term: 'Difference', definition: 'The result after subtracting numbers' }], curriculumStandards: [] },
          { id: 'p2_m3', title: 'Patterns and Shapes', description: 'Sorting properties of circles and triangles', grade: 'Grade 2', subject: 'Mathematics', learningObjectives: ['Recognize basic patterns repeating structures'], keyVocabulary: [{ term: 'Pattern', definition: 'Ordered repeating shapes or numbers sequence' }] }
        ] },
        { name: 'English', topics: [
          { id: 'p2_e1', title: 'Sentence Structure', description: 'Capital letters and full stops', grade: 'Grade 2', subject: 'English', learningObjectives: ['Write a complete sentence'], keyVocabulary: [{ term: 'Capital', definition: 'A large letter beginning a sentence' }, { term: 'Noun', definition: 'A naming word for person, place, thing' }], curriculumStandards: [] },
          { id: 'p2_e2', title: 'Action Verbs', description: 'Identifying doing words', grade: 'Grade 2', subject: 'English', learningObjectives: ['Identify verbs in text'], keyVocabulary: [{ term: 'Verb', definition: 'An action or doing word' }], curriculumStandards: [] },
          { id: 'p2_e3', title: 'Plural Words with S and ES', description: 'Understanding singular vs plural nouns', grade: 'Grade 2', subject: 'English', learningObjectives: ['Convert single nouns to plurals rules'], keyVocabulary: [{ term: 'Plural', definition: 'More than one item indicator' }] }
        ] },
        { name: 'Sesotho', topics: [
          { id: 'p2_s1', title: 'Dipalo ka Sesotho', description: 'Numbers 1-10 in Sesotho', grade: 'Grade 2', subject: 'Sesotho', learningObjectives: ['Count to 10 in Sesotho'], keyVocabulary: [{ term: 'Nngwe', definition: 'One' }, { term: 'Peli', definition: 'Two' }, { term: 'Tharo', definition: 'Three' }], curriculumStandards: [] },
          { id: 'p2_s2', title: 'Mebala ka Sesotho', description: 'Colors in Sesotho', grade: 'Grade 2', subject: 'Sesotho', learningObjectives: ['Identify colors in the environment'], keyVocabulary: [{ term: 'Hubelu', definition: 'Red' }, { term: 'Tala', definition: 'Green or Blue' }], curriculumStandards: [] },
          { id: 'p2_s3', title: 'Liphoofolo tsa Gae', description: 'Sesotho domestic animals vocabulary', grade: 'Grade 2', subject: 'Sesotho', learningObjectives: ['Match animal names in Sesotho'], keyVocabulary: [{ term: 'Khomo', definition: 'Cow' }, { term: 'Pere', definition: 'Horse' }] }
        ] },
        { name: 'Natural Science', topics: [
          { id: 'p2_n1', title: 'Living vs Non-Living', description: 'Characteristics of life', grade: 'Grade 2', subject: 'Natural Science', learningObjectives: ['Differentiate plants from stones'], keyVocabulary: [{ term: 'Growth', definition: 'Increase in physical size over time' }, { term: 'Organism', definition: 'Any individual living system' }], curriculumStandards: [] },
          { id: 'p2_n2', title: 'Water and Uses', description: 'Sources of clean drinking water and conservation', grade: 'Grade 2', subject: 'Natural Science', learningObjectives: ['List water usages in school gardens'], keyVocabulary: [{ term: 'Conservation', definition: 'Saving natural resources wisely' }] },
          { id: 'p2_n3', title: 'Weather Dynamics', description: 'Understanding rain, snow, heat, and clouds', grade: 'Grade 2', subject: 'Natural Science', learningObjectives: ['Identify daily weather fluctuations'], keyVocabulary: [{ term: 'Precipitation', definition: 'Water droplets falling from sky clouds' }] }
        ] },
        { name: 'Social Sciences', topics: [
          { id: 'p2_ss1', title: 'Our Classroom Community', description: 'Roles and rules in the classroom helper lists', grade: 'Grade 2', subject: 'Social Sciences', learningObjectives: ['Identify roles of classroom helpers'], keyVocabulary: [{ term: 'Rules', definition: 'Directions showing what is allowed' }], curriculumStandards: [] },
          { id: 'p2_ss2', title: 'Jobs in Our Town', description: 'Farmers, doctors, uniform builders, and post office helpers', grade: 'Grade 2', subject: 'Social Sciences', learningObjectives: ['Tell what various job actions do'], keyVocabulary: [{ term: 'Profession', definition: 'Paid career path requiring practice' }] }
        ] },
        { name: 'Life Skills', topics: [
          { id: 'p2_l1', title: 'Personal Hygiene', description: 'Keeping clean and healthy', grade: 'Grade 2', subject: 'Life Skills', learningObjectives: ['Explain importance of bathing and brushing teeth'], keyVocabulary: [{ term: 'Hygiene', definition: 'Practices that maintain good health' }], curriculumStandards: [] },
          { id: 'p2_l2', title: 'Fire Safety awareness', description: 'Hazards of matches and charcoal ovens', grade: 'Grade 2', subject: 'Life Skills', learningObjectives: ['Recognize emergency heat warnings'], keyVocabulary: [{ term: 'Emergency', definition: 'An urgent situation needing fast action' }] }
        ] }
      ] 
    },
    { 
      grade: 'Grade 3', 
      subjects: [
        { name: 'Mathematics', topics: [
          { id: 'p3_m1', title: 'Intro to Times Tables', description: 'Grouping and multiplication', grade: 'Grade 3', subject: 'Mathematics', learningObjectives: ['Understand groups of multiplication'], keyVocabulary: [{ term: 'Multiplication', definition: 'Repeated addition of same groups' }, { term: 'Product', definition: 'The outcome of multiplication' }], curriculumStandards: [] },
          { id: 'p3_m2', title: 'Telling Time on Clocks', description: 'Hours, halves, and quarters on analog dials', grade: 'Grade 3', subject: 'Mathematics', learningObjectives: ['Read analog clocks to quarter hour'], keyVocabulary: [{ term: 'Analog', definition: 'A clock face with moving hands' }], curriculumStandards: [] },
          { id: 'p3_m3', title: 'Intro to Fractions', description: 'Halves, thirds, and quarters shapes mapping', grade: 'Grade 3', subject: 'Mathematics', learningObjectives: ['Draw simple fraction parts'], keyVocabulary: [{ term: 'Fraction', definition: 'A part of a whole quantity' }] }
        ] },
        { name: 'English', topics: [
          { id: 'p3_e1', title: 'Descriptive Words', description: 'Using descriptive adjectives to enrich stories', grade: 'Grade 3', subject: 'English', learningObjectives: ['Describe a main story character'], keyVocabulary: [{ term: 'Adjective', definition: 'A word that describes a noun' }], curriculumStandards: [] },
          { id: 'p3_e2', title: 'Basic Punctuation', description: 'Commas and question marks', grade: 'Grade 3', subject: 'English', learningObjectives: ['Apply commas and question marks'], keyVocabulary: [{ term: 'Punctuation', definition: 'Marks showing pauses or questions' }], curriculumStandards: [] },
          { id: 'p3_e3', title: 'Pronoun Matchups', description: 'Using he, she, they, and it correctly', grade: 'Grade 3', subject: 'English', learningObjectives: ['Substitute naming items with pronouns'], keyVocabulary: [{ term: 'Pronoun', definition: 'A replacement word for nouns' }] }
        ] },
        { name: 'Sesotho', topics: [
          { id: 'p3_s1', title: 'Ditloaelo tsa Basotho', description: 'Basotho traditions and customs', grade: 'Grade 3', subject: 'Sesotho', learningObjectives: ['Describe traditional clothing and foods'], keyVocabulary: [{ term: 'Mokorotlo', definition: 'Traditional Basotho conical straw hat' }, { term: 'Mose', definition: 'Dress' }], curriculumStandards: [] },
          { id: 'p3_s2', title: 'Lithoko tse Khutšoane', description: 'Intro to Sesotho praise poetry', grade: 'Grade 3', subject: 'Sesotho', learningObjectives: ['Recite a small cultural praise verse'], keyVocabulary: [{ term: 'Seroki', definition: 'Praise poet or reciter' }], curriculumStandards: [] },
          { id: 'p3_s3', title: 'Lipale le Banna', description: 'Short stories of historic Basotho village lives', grade: 'Grade 3', subject: 'Sesotho', learningObjectives: ['State lesson or objective of stories'], keyVocabulary: [{ term: 'Tšomo', definition: 'Fable or traditional folk story' }] }
        ] },
        { name: 'Natural Science', topics: [
          { id: 'p3_n1', title: 'Our Amazing Bodies', description: 'External and internal organs foundations', grade: 'Grade 3', subject: 'Natural Science', learningObjectives: ['Identify heart, lungs, and stomach'], keyVocabulary: [{ term: 'Heart', definition: 'Organ pumping blood through body' }, { term: 'Lungs', definition: 'Organs used for breathing air' }], curriculumStandards: [] },
          { id: 'p3_n2', title: 'Animal Life Cycles', description: 'Frogs, butterflies, and domestic mammals', grade: 'Grade 3', subject: 'Natural Science', learningObjectives: ['Identify developmental stages of frogs'], keyVocabulary: [{ term: 'Metamorphosis', definition: 'Biological transformation process of animal bodies' }] }
        ] },
        { name: 'Social Sciences', topics: [
          { id: 'p3_ss1', title: 'My School Locality', description: 'Local geography and landmarks mapping', grade: 'Grade 3', subject: 'Social Sciences', learningObjectives: ['Draw simple landmark map'], keyVocabulary: [{ term: 'Location', definition: 'The physical place of something' }] },
          { id: 'p3_ss2', title: 'Traditional Leadership', description: 'The Chief and community gatherings', grade: 'Grade 3', subject: 'Social Sciences', learningObjectives: ['Explain chief duties in village councils'], keyVocabulary: [{ term: 'Pitso', definition: 'A traditional community gathering or assembly' }] }
        ] },
        { name: 'Life Skills', topics: [
          { id: 'p3_l1', title: 'Manners and Empathy', description: 'Understanding others\' feelings and sharing', grade: 'Grade 3', subject: 'Life Skills', learningObjectives: ['List active listening techniques'], keyVocabulary: [{ term: 'Empathy', definition: 'Understanding the feelings of others' }] },
          { id: 'p3_l2', title: 'Our Healthy Food Plate', description: 'Vegetables, proteins, and balanced portions', grade: 'Grade 3', subject: 'Life Skills', learningObjectives: ['Identify healthy vitamins groups'], keyVocabulary: [{ term: 'Nutrition', definition: 'Consuming balanced food for energetic growth' }] }
        ] }
      ] 
    },
    { 
      grade: 'Grade 4', 
      subjects: [
        { name: 'Mathematics', topics: [
          { id: 'p4_m1', title: 'Equivalent Fractions', description: 'Recognizing that 1/2 equals 2/4', grade: 'Grade 4', subject: 'Mathematics', learningObjectives: ['Find equivalent fractions'], keyVocabulary: [{ term: 'Fractions', definition: 'Part of a whole quantity' }, { term: 'Equivalent', definition: 'Having equal mathematical value' }], curriculumStandards: [] },
          { id: 'p4_m2', title: 'Long Division Basics', description: 'Sharing larger numbers to groups', grade: 'Grade 4', subject: 'Mathematics', learningObjectives: ['Divide 2-digit number by 1-digit'], keyVocabulary: [{ term: 'Remainder', definition: 'Leftover amount after division' }], curriculumStandards: [] },
          { id: 'p4_m3', title: 'Measuring Lengths', description: 'Units of Millimeters, Centimeters, and Meters', grade: 'Grade 4', subject: 'Mathematics', learningObjectives: ['Convert centimeters to millimeters and back'], keyVocabulary: [{ term: 'Measurement', definition: 'Sizing up physical length in standardized units' }] }
        ] },
        { name: 'English', topics: [
          { id: 'p4_e1', title: 'Parts of Speech Details', description: 'Nouns, Verbs, and Adjectives', grade: 'Grade 4', subject: 'English', learningObjectives: ['Classify different parts of speech'], keyVocabulary: [{ term: 'Noun', definition: 'A naming word for person, place, thing' }, { term: 'Verb', definition: 'An action word' }], curriculumStandards: [] },
          { id: 'p4_e2', title: 'Tenses: Simple Past', description: 'Talking about actions in the past', grade: 'Grade 4', subject: 'English', learningObjectives: ['Use regular past tense suffixes'], keyVocabulary: [{ term: 'Suffix', definition: 'Letters added to the end of a word' }], curriculumStandards: [] },
          { id: 'p4_e3', title: 'Prefixes and Opposites', description: 'Utilizing UN, DIS, and IM to change vocabulary definitions', grade: 'Grade 4', subject: 'English', learningObjectives: ['Assemble antonyms using prefix attachments'], keyVocabulary: [{ term: 'Prefix', definition: 'Syllables locked onto the start of root words' }] }
        ] },
        { name: 'Sesotho', topics: [
          { id: 'p4_s1', title: 'Dipale le Ditšomo', description: 'Traditional stories and folk tales', grade: 'Grade 4', subject: 'Sesotho', learningObjectives: ['Summarize the moral lesson of a folk tale'], keyVocabulary: [{ term: 'Ditšomo', definition: 'Basotho folk tales/stories' }, { term: 'Thuto', definition: 'Lesson or moral of a story' }], curriculumStandards: [] },
          { id: 'p4_s2', title: 'Maele a Bohloko', description: 'Intro to classic Sesotho wisdom idioms', grade: 'Grade 4', subject: 'Sesotho', learningObjectives: ['Explain meaning of 3 common idioms'], keyVocabulary: [{ term: 'Maele', definition: 'Sesotho proverb or proverb systems' }] }
        ] },
        { name: 'Natural Science', topics: [
          { id: 'p4_n1', title: 'Life Cycles of Flowering Plants', description: 'From seed germination to maturity', grade: 'Grade 4', subject: 'Natural Science', learningObjectives: ['Identify seed leaves and embryonic stages'], keyVocabulary: [{ term: 'Germination', definition: 'A seed starting to grow' }, { term: 'Embryo', definition: 'An early stage of plant growth' }], curriculumStandards: [] },
          { id: 'p4_n2', title: 'Animal Habitats', description: 'Ecosystem homes of different animals', grade: 'Grade 4', subject: 'Natural Science', learningObjectives: ['Compare desert adaptations to grasslands'], keyVocabulary: [{ term: 'Habitat', definition: 'Natural home of an organism' }] },
          { id: 'p4_n3', title: 'Intro to Matter', description: 'Differentiating shapes of solids, fluids, and gaseous forces', grade: 'Grade 4', subject: 'Natural Science', learningObjectives: ['List transitions like melting or freezing'], keyVocabulary: [{ term: 'Matter', definition: 'Physical substance occupying spaces' }] }
        ] },
        { name: 'Social Sciences', topics: [
          { id: 'p4_ss1', title: 'Basic Map Skills', description: 'Introduction to compass points', grade: 'Grade 4', subject: 'Social Sciences', learningObjectives: ['Identify North, South, East, West'], keyVocabulary: [{ term: 'Compass', definition: 'Instrument showing magnetic directions' }], curriculumStandards: [] },
          { id: 'p4_ss2', title: 'Kingdom of Lesotho History', description: 'King Moshoeshoe I and the founding', grade: 'Grade 4', subject: 'Social Sciences', learningObjectives: ['Locate Thaba Bosiu and explain historical role'], keyVocabulary: [{ term: 'Fortress', definition: 'Defended natural stronghold' }] },
          { id: 'p4_ss3', title: 'Rivers of Southern Africa', description: 'The Senqu/Orange river paths and catchment resources', grade: 'Grade 4', subject: 'Social Sciences', learningObjectives: ['Trace the Senqu river across Lesotho mapping borders'], keyVocabulary: [{ term: 'Catchment', definition: 'Natural land basin drawing rainfall down' }] }
        ] },
        { name: 'Life Skills', topics: [
          { id: 'p4_l1', title: 'Healthy Eating Choices', description: 'Basic vitamins and food groups', grade: 'Grade 4', subject: 'Life Skills', learningObjectives: ['Categorize food types correctly'], keyVocabulary: [{ term: 'Vitamins', definition: 'Essential organic health compounds' }] },
          { id: 'p4_l2', title: 'Peer Interaction Dynamics', description: 'Handling teasing and communication bounds in circles', grade: 'Grade 4', subject: 'Life Skills', learningObjectives: ['Acknowledge polite refusals strategies'], keyVocabulary: [{ term: 'Boundary', definition: 'Personal limits established for behavior' }] }
        ] }
      ] 
    },
    { 
      grade: 'Grade 5', 
      subjects: [
        { name: 'Mathematics', topics: [
          { id: 'p5_m1', title: 'Percentages', description: 'Introducing parts of one hundred', grade: 'Grade 5', subject: 'Mathematics', learningObjectives: ['Convert simple fractions to percentages'], keyVocabulary: [{ term: 'Percent', definition: 'Parts per one hundred' }], curriculumStandards: [] },
          { id: 'p5_m2', title: 'Data Interpretation', description: 'Reading Bar Graphs and tally charts', grade: 'Grade 5', subject: 'Mathematics', learningObjectives: ['Extract values from axis layouts'], keyVocabulary: [{ term: 'Axis', definition: 'Reference line on a graph' }] },
          { id: 'p5_m3', title: '3D Shapes Properties', description: 'Faces, Edges, and Vertices of Cubes', grade: 'Grade 5', subject: 'Mathematics', learningObjectives: ['Count sides and vertex counts of geometric prisms'], keyVocabulary: [{ term: 'Vertices', definition: 'Corner points where edges lock' }] }
        ] },
        { name: 'English', topics: [
          { id: 'p5_e1', title: 'Grammar: Pronouns', description: 'Replacing recurring noun phrases', grade: 'Grade 5', subject: 'English', learningObjectives: ['Substitute personal and subjective pronouns'], keyVocabulary: [{ term: 'Pronoun', definition: 'A word replacing a naming noun' }], curriculumStandards: [] },
          { id: 'p5_e2', title: 'Reading Comprehension Strategies', description: 'Finding theme and main points in informative text', grade: 'Grade 5', subject: 'English', learningObjectives: ['Identify paragraphs summaries'], keyVocabulary: [{ term: 'Summary', definition: 'Brief statement of main points' }] },
          { id: 'p5_e3', title: 'Tenses: Future and Past Perfect', description: 'Utilizing auxiliary verbs like will, shall, and had', grade: 'Grade 5', subject: 'English', learningObjectives: ['Differentiate plans from finished events tenses'], keyVocabulary: [{ term: 'Auxiliary', definition: 'Helping verbs establishing tenses timelines' }] }
        ] },
        { name: 'Sesotho', topics: [
          { id: 'p5_s1', title: 'Maele le Maele a Sesotho', description: 'Common Sesotho proverbs and idioms', grade: 'Grade 5', subject: 'Sesotho', learningObjectives: ['Interpret 5 traditional proverbs'], keyVocabulary: [{ term: 'Maele', definition: 'Idioms conveying cultural wisdom' }], curriculumStandards: [] },
          { id: 'p5_s2', title: 'Mahlalefi a Thuto', description: 'Analyses of advanced folktales containing animal symbols', grade: 'Grade 5', subject: 'Sesotho', learningObjectives: ['Summarize character attributes of tricksters in stories'], keyVocabulary: [{ term: 'Phoofolo', definition: 'Animal character' }] }
        ] },
        { name: 'Natural Science', topics: [
          { id: 'p5_n1', title: 'Our Solar System', description: 'The Sun and its eight orbiting bodies', grade: 'Grade 5', subject: 'Natural Science', learningObjectives: ['Identify positions of inner rocky planets'], keyVocabulary: [{ term: 'Planet', definition: 'Massive sphere orbiting a star' }, { term: 'Orbit', definition: 'The path of a planet' }], curriculumStandards: [] },
          { id: 'p5_n2', title: 'States of Matter Phase Shifts', description: 'Condensation, melting, and evaporation rules', grade: 'Grade 5', subject: 'Natural Science', learningObjectives: ['Identify phase transition names'], keyVocabulary: [{ term: 'Boiling', definition: 'Fast transition of liquids to vapor pressure' }] },
          { id: 'p5_n3', title: 'Soil types and Agriculture', description: 'Comparing Sand, Clay, and Fertile Loam soils', grade: 'Grade 5', subject: 'Natural Science', learningObjectives: ['Assess water drainage of different soils'], keyVocabulary: [{ term: 'Loam', definition: 'Balanced soil profile perfect for plants' }] }
        ] },
        { name: 'Social Sciences', topics: [
          { id: 'p5_ss1', title: 'Geographic Resources of Lesotho', description: 'Natural water and diamond mining resources', grade: 'Grade 5', subject: 'Social Sciences', learningObjectives: ['Identify diamond mining sites'], keyVocabulary: [{ term: 'Resource', definition: 'Valuable raw physical material' }], curriculumStandards: [] },
          { id: 'p5_ss2', title: 'Agricultural Trade', description: 'Wool, mohair, and cash crops exports', grade: 'Grade 5', subject: 'Social Sciences', learningObjectives: ['Trace export steps of mohair wool harvests'], keyVocabulary: [{ term: 'Export', definition: 'Sending trade output out of boundaries' }] }
        ] },
        { name: 'Life Skills', topics: [
          { id: 'p5_l1', title: 'Self-Esteem and Confidence', description: 'Valuing yourself and matching peers', grade: 'Grade 5', subject: 'Life Skills', learningObjectives: ['Name individual traits to build confidence'], keyVocabulary: [{ term: 'Esteem', definition: 'Respect and admiration for oneself' }] },
          { id: 'p5_l2', title: 'Collaborating in Groups', description: 'Leadership roles and active conflict delegation', grade: 'Grade 5', subject: 'Life Skills', learningObjectives: ['Acknowledge group compromise patterns'], keyVocabulary: [{ term: 'Compromise', definition: 'Balancing opposing arguments midways' }] }
        ] }
      ] 
    },
    { 
      grade: 'Grade 6', 
      subjects: [
        { name: 'Mathematics', topics: [
          { id: 'p6_m1', title: 'Ratios and Proportions', description: 'Comparing two different mathematical sets', grade: 'Grade 6', subject: 'Mathematics', learningObjectives: ['Simplify ratios to lowest integers'], keyVocabulary: [{ term: 'Ratio', definition: 'Relative magnitude of two values' }], curriculumStandards: [] },
          { id: 'p6_m2', title: 'Algebraic Number Patterns', description: 'Formulating step sequences and geometric patterns', grade: 'Grade 6', subject: 'Mathematics', learningObjectives: ['Find math formula for step gaps'], keyVocabulary: [{ term: 'Sequence', definition: 'An ordered list of numbers' }] },
          { id: 'p6_m3', title: 'Volume and Capacity', description: 'Calculating cuboid properties in liters and milliliters', grade: 'Grade 6', subject: 'Mathematics', learningObjectives: ['Convert capacity measures and scale cuboids'], keyVocabulary: [{ term: 'Volume', definition: 'Amount of 3D spaces occupied' }] }
        ] },
        { name: 'English', topics: [
          { id: 'p6_e1', title: 'Report Writing', description: 'How to write structured factual reports objectively', grade: 'Grade 6', subject: 'English', learningObjectives: ['Draft and layout simple columns objectively'], keyVocabulary: [{ term: 'Report', definition: 'A factual and objective text layout' }] },
          { id: 'p6_e2', title: 'Conjunctions and Clauses', description: 'Using because, although, and unless to compose complex sentences', grade: 'Grade 6', subject: 'English', learningObjectives: ['Assemble compound and complex grammar blocks'], keyVocabulary: [{ term: 'Clause', definition: 'Grammar piece containing subject and active verb' }] }
        ] },
        { name: 'Sesotho', topics: [
          { id: 'p6_s1', title: 'Moetlo le Bosotho', description: 'Cultural initiation, Basotho blankets, and heritage lore', grade: 'Grade 6', subject: 'Sesotho', learningObjectives: ['Define components of Basotho cultural identity'], keyVocabulary: [{ term: 'Moetlo', definition: 'Tradition or custom context' }] },
          { id: 'p6_s2', title: 'Sebopeho sa Sesotho: Likarolo tsa Puo', description: 'Sesotho parts of speech in grammar text', grade: 'Grade 6', subject: 'Sesotho', learningObjectives: ['Identify verbs and pronouns in traditional dialogue'], keyVocabulary: [{ term: 'Moemeli', definition: 'Pronoun representing characters' }] }
        ] },
        { name: 'Natural Science', topics: [
          { id: 'p6_n1', title: 'Electrical Circuits Basics', description: 'Developing functional series loops with bulbs', grade: 'Grade 6', subject: 'Natural Science', learningObjectives: ['Differentiate conductors from insulators'], keyVocabulary: [{ term: 'Circuit', definition: 'A closed path for electric current' }, { term: 'Conductor', definition: 'Material that allows electricity flow' }], curriculumStandards: [] },
          { id: 'p6_n2', title: 'The Water Cycle', description: 'Evaporation, Transpiration, and Condensation steps', grade: 'Grade 6', subject: 'Natural Science', learningObjectives: ['Draw the complete water balance loop across mountains'], keyVocabulary: [{ term: 'Transpiration', definition: 'Water vapor emitted outward from plant leaflets' }] }
        ] },
        { name: 'Social Sciences', topics: [
          { id: 'p6_ss1', title: 'Foundations of Democracy', description: 'Elections, civil structures, and justice systems', grade: 'Grade 6', subject: 'Social Sciences', learningObjectives: ['Understand voting mechanics'], keyVocabulary: [{ term: 'Elections', definition: 'Process where voters select representatives' }], curriculumStandards: [] },
          { id: 'p6_ss2', title: 'The Great Trek and Basotho Contacts', description: 'Boer migrations and conflicts over Caledon River boundaries', grade: 'Grade 6', subject: 'Social Sciences', learningObjectives: ['Explain key battles and negotiations results'], keyVocabulary: [{ term: 'Treaty', definition: 'An official formal peace contract between states' }] }
        ] },
        { name: 'Life Skills', topics: [
          { id: 'p6_l1', title: 'Conflict Resolution', description: 'Resolving disputes non-violently in schoolyards', grade: 'Grade 6', subject: 'Life Skills', learningObjectives: ['Apply mediation loops and negotiation'], keyVocabulary: [{ term: 'Mediation', definition: 'Resolving arguments via impartial third-party' }] },
          { id: 'p6_l2', title: 'Peer Influence and Desires', description: 'Saying no to dangerous substances and risky actions', grade: 'Grade 6', subject: 'Life Skills', learningObjectives: ['Articulate defensive response loops assertively'], keyVocabulary: [{ term: 'Assertiveness', definition: 'Standing up for opinions confidently without malice' }] }
        ] }
      ] 
    },
    { 
      grade: 'Grade 7', 
      subjects: [
        { name: 'Mathematics', topics: [
          { id: 'p7_m1', title: 'Negative Numbers', description: 'Integers and directions on number scales', grade: 'Grade 7', subject: 'Mathematics', learningObjectives: ['Perform operations with negative limits'], keyVocabulary: [{ term: 'Integers', definition: 'Whole positive or negative numbers' }], curriculumStandards: [] },
          { id: 'p7_m2', title: 'Calculations: Area of 2D Shapes', description: 'Finding area on plane profiles of triangles and rectangles', grade: 'Grade 7', subject: 'Mathematics', learningObjectives: ['Calculate boundary area of composite planes'], keyVocabulary: [{ term: 'Formulas', definition: 'Mathematical equations rules' }] },
          { id: 'p7_m3', title: 'Algebra Equations', description: 'Solving for unknowns like x + 4 = 10', grade: 'Grade 7', subject: 'Mathematics', learningObjectives: ['Isolate simple algebraic variables'], keyVocabulary: [{ term: 'Equations', definition: 'Mathematical assertions that two terms are equal' }] }
        ] },
        { name: 'English', topics: [
          { id: 'p7_e1', title: 'Poetry Forms', description: 'Analyzing poetry mechanics, stanzas, and rhythms', grade: 'Grade 7', subject: 'English', learningObjectives: ['Identify figurative language forms'], keyVocabulary: [{ term: 'Metaphor', definition: 'Direct non-literal comparison statement' }] },
          { id: 'p7_e2', title: 'Active and Passive Voice', description: 'Changing word registers and emphasizing actions', grade: 'Grade 7', subject: 'English', learningObjectives: ['Convert simple active phrases to passive format'], keyVocabulary: [{ term: 'Passive', definition: 'Sentence format prioritizing action outcomes' }] }
        ] },
        { name: 'Sesotho', topics: [
          { id: 'p7_s1', title: 'Sebopeho sa Sesotho', description: 'Sesotho grammar and advanced noun prefix groupings', grade: 'Grade 7', subject: 'Sesotho', learningObjectives: ['Identify noun prefix groupings'], keyVocabulary: [{ term: 'Sehlopha', definition: 'Prefix-based noun class group' }] },
          { id: 'p7_s2', title: 'Lipale tsa Kgale', description: 'Deep analyses of classic Basotho regional narratives', grade: 'Grade 7', subject: 'Sesotho', learningObjectives: ['Examine main characters motives in texts'], keyVocabulary: [{ term: 'Moemeli', definition: 'Proverbial character models' }] }
        ] },
        { name: 'Natural Science', topics: [
          { id: 'p7_n1', title: 'The Human Digestive System', description: 'Flow of nutritional digestion through digestive tract organs', grade: 'Grade 7', subject: 'Natural Science', learningObjectives: ['Identify functions of small intestine'], keyVocabulary: [{ term: 'Enzymes', definition: 'Proteins speeding biochemical reaction rates' }] },
          { id: 'p7_n2', title: 'Elements and Compounds', description: 'Distinguishing pure atomic elements from bonded chemical compounds', grade: 'Grade 7', subject: 'Natural Science', learningObjectives: ['Identify molecules formula of water and salt'], keyVocabulary: [{ term: 'Compound', definition: 'Substance made of multiple bonded element classes' }] }
        ] },
        { name: 'Social Sciences', topics: [
          { id: 'p7_ss1', title: 'Lesotho\'s Independence Day History', description: 'Reaching sovereignty on Oct 4, 1966', grade: 'Grade 7', subject: 'Social Sciences', learningObjectives: ['Explain key treaties leading to independence'], keyVocabulary: [{ term: 'Sovereignty', definition: 'Full self-governing political power' }] },
          { id: 'p7_ss2', title: 'Climate and Flora of Lesotho', description: 'Alpine grasslands and Lesotho Highlands Water project maps', grade: 'Grade 7', subject: 'Social Sciences', learningObjectives: ['Detail Highland Water dam systems paths'], keyVocabulary: [{ term: 'Reservoir', definition: 'Amassed storage basin of drinking water' }] }
        ] },
        { name: 'Life Skills', topics: [
          { id: 'p7_l1', title: 'Puberty and Body Changes', description: 'Biological adjustments of adolescence', grade: 'Grade 7', subject: 'Life Skills', learningObjectives: ['Describe biological shifts with maturity'], keyVocabulary: [{ term: 'Adolescence', definition: 'Transition from childhood to adulthood' }] },
          { id: 'p7_l2', title: 'Career Path Explorations', description: 'Matching interests to vocational or academic streams', grade: 'Grade 7', subject: 'Life Skills', learningObjectives: ['Enumerate traits for three distinct professions'], keyVocabulary: [{ term: 'Vocation', definition: 'Practical training path for skilled professions' }] }
        ] }
      ] 
    }
  ],
  highSchool: [
    { 
      grade: 'Grade 8', 
      subjects: [
        { name: 'Mathematics', topics: [
          { id: 'm3_g8', title: 'Linear Equations', description: 'Solving variable values with brackets and isolating terms', grade: 'Grade 8', subject: 'Mathematics', learningObjectives: ['Isolate equations variables'], keyVocabulary: [{ term: 'Variables', definition: 'Placeholders for numerical amounts' }], curriculumStandards: [] },
          { id: 'm8_m2', title: 'Laws of Exponents', description: 'Power operations, scaling indexes, and simplifying bases', grade: 'Grade 8', subject: 'Mathematics', learningObjectives: ['Simplify compound powers bases'], keyVocabulary: [{ term: 'Base', definition: 'Number that is raised to an exponent' }], curriculumStandards: [] },
          { id: 'm8_m3', title: 'Algebraic Expressions', description: 'Adding, subtracting, and simplifying polynomial variables', grade: 'Grade 8', subject: 'Mathematics', learningObjectives: ['Solve polynomials of 2 terms'], keyVocabulary: [{ term: 'Polynomial', definition: 'Mathematical expression with multiple variable terms' }] },
          { id: 'm8_m4', title: 'Angle Relationships', description: 'Complementary, supplementary, and parallel lines geometry', grade: 'Grade 8', subject: 'Mathematics', learningObjectives: ['Identify matching angles on parallel crossings'], keyVocabulary: [{ term: 'Transversal', definition: 'Line intersecting parallel paths' }] }
        ] },
        { name: 'English', topics: [
          { id: 'e8_1', title: 'Creative Writing Techniques', description: 'Narrative structures, character hooks, and plot devices', grade: 'Grade 8', subject: 'English', learningObjectives: ['Draft descriptive scenario openings'], keyVocabulary: [{ term: 'Narrator', definition: 'The voice recounting story events' }] },
          { id: 'e8_2', title: 'Active & Passive Voice', description: 'Direct verb actions vs passive descriptive formatting', grade: 'Grade 8', subject: 'English', learningObjectives: ['Convert and shift registers of voice patterns'], keyVocabulary: [{ term: 'Agent', definition: 'The entity performing action steps' }] },
          { id: 'e8_3', title: 'Reading Comprehension: Themes', description: 'Extracting implicit messages and main summaries in editorials', grade: 'Grade 8', subject: 'English', learningObjectives: ['Highlight structural paragraphs biases'], keyVocabulary: [{ term: 'Inference', definition: 'Drawing reasonable deductions not stated explicitly' }] }
        ] },
        { name: 'Sesotho', topics: [
          { id: 's8_1', title: 'Dipalelo tsa Senyakanyaka', description: 'Explorative classical Sesotho literature and character analyses', grade: 'Grade 8', subject: 'Sesotho', learningObjectives: ['Analyze main narrative plots'], keyVocabulary: [{ term: 'Mongoli', definition: 'Author of written works' }] },
          { id: 's8_2', title: 'Maele le Maatlapuo', description: 'Sesotho proverbial units and dynamic idioms applications', grade: 'Grade 8', subject: 'Sesotho', learningObjectives: ['State lessons behind three historic idioms'], keyVocabulary: [{ term: 'Maeto', definition: 'Moral directives masked as folk idioms' }] },
          { id: 's8_3', title: 'Sehlopha sa Maina', description: 'Understanding noun prefix categories and concord markers', grade: 'Grade 8', subject: 'Sesotho', learningObjectives: ['Categorize nouns into correct prefix categories'], keyVocabulary: [{ term: 'Sebopeho', definition: 'Structural morphology of words' }] }
        ] },
        { name: 'Physical Science', topics: [
          { id: 'ps8_1', title: 'Kinetic Molecular Theory', description: 'Arrangements and behavior of molecules in solid, liquid, gas phases', grade: 'Grade 8', subject: 'Physical Science', learningObjectives: ['Relate temperature to molecular kinetics'], keyVocabulary: [{ term: 'Molecules', definition: 'Groups of bonded elemental atoms' }], curriculumStandards: [] },
          { id: 'ps8_2', title: 'Atoms and elements', description: 'Differentiating protons, neutrons, and electrons on the Periodic Table', grade: 'Grade 8', subject: 'Physical Science', learningObjectives: ['Map atomic counts of first ten elements'], keyVocabulary: [{ term: 'Neutron', definition: 'Neutral subatomic particle in core atomic nucleus' }] },
          { id: 'ps8_3', title: 'Density and Measurements', description: 'Calculating mass divided by volume in fluid environments', grade: 'Grade 8', subject: 'Physical Science', learningObjectives: ['Formulate densities with scale calipers'], keyVocabulary: [{ term: 'Density', definition: 'Mass per unit volume ratio' }] }
        ] },
        { name: 'Life Sciences', topics: [
          { id: 'ls8_1', title: 'Sensory Organs and Triggers', description: 'Interpreting biological sight, smell, and auditory pathways', grade: 'Grade 8', subject: 'Life Sciences', learningObjectives: ['Describe anatomical path of optical signals'], keyVocabulary: [{ term: 'Receptors', definition: 'Nerve cells responding to stimuli' }] },
          { id: 'ls8_2', title: 'Animal and plant cells', description: 'Key biological cellular organelles profiles and organelles interactions', grade: 'Grade 8', subject: 'Life Sciences', learningObjectives: ['Contrast plant cell walls with animal cell boundaries'], keyVocabulary: [{ term: 'Chloroplast', definition: 'Organelle containing chlorophyll processing photosynthesis' }] },
          { id: 'ls8_3', title: 'Skeletal Support Systems', description: 'Anatomy of human skeletal bones and muscles linkages', grade: 'Grade 8', subject: 'Life Sciences', learningObjectives: ['List names of three critical skeletal bones'], keyVocabulary: [{ term: 'Cartilage', definition: 'Flexible muscle tissue guarding joint bone paths' }] }
        ] },
        { name: 'Social Sciences', topics: [
          { id: 'ss8_1', title: 'The Industrial Revolution', description: 'Mechanization, steam, and colonization drivers globally', grade: 'Grade 8', subject: 'Social Sciences', learningObjectives: ['Describe colonization drivers around factories'], keyVocabulary: [{ term: 'Industrialization', definition: 'Economic transition to machine manufacturing' }] },
          { id: 'ss8_2', title: 'Latitude, Longitude and Grids', description: 'Plotting locations and conversions using worldwide coordinate lines', grade: 'Grade 8', subject: 'Social Sciences', learningObjectives: ['Identify exact degree grids of major capitals'], keyVocabulary: [{ term: 'Equator', definition: 'Central geographic latitude dividing hemisphere limits' }] },
          { id: 'ss8_3', title: 'Mineral Wealth of Southern Africa', description: 'Resources allocation, gold mining, and diamonds paths', grade: 'Grade 8', subject: 'Social Sciences', learningObjectives: ['Detail geographic hubs of resources in Lesotho'], keyVocabulary: [{ term: 'Alluvial', definition: 'Mineral resources deposited by flowing river water' }] }
        ] },
        { name: 'Business Studies', topics: [
          { id: 'bs8_1', title: 'Introduction to Accounting', description: 'Assets, Liabilities, and double entry ledger rules', grade: 'Grade 8', subject: 'Business Studies', learningObjectives: ['Formulate simple double entry balances'], keyVocabulary: [{ term: 'Assets', definition: 'Valuable items owned by a company' }] },
          { id: 'bs8_2', title: 'Sectors of the Economy', description: 'Primary extraction, Secondary production, and Tertiary services', grade: 'Grade 8', subject: 'Business Studies', learningObjectives: ['Categorize businesses correctly'], keyVocabulary: [{ term: 'Sectors', definition: 'Economic segments of national output' }] },
          { id: 'bs8_3', title: 'Business Plan Formulations', description: 'Undergirding SWOT analysis, pricing formulas, and cash statements', grade: 'Grade 8', subject: 'Business Studies', learningObjectives: ['Assemble basic SWOT matrices'], keyVocabulary: [{ term: 'SWOT', definition: 'Assessment of Strengths, Weaknesses, Opportunities, Threats' }] }
        ] }
      ] 
    },
    { 
      grade: 'Grade 9', 
      subjects: [
        { name: 'Mathematics', topics: [
          { id: 'm4_g9', title: 'Gradients and Graphs', description: 'Plotting linear equation axes', grade: 'Grade 9', subject: 'Mathematics', learningObjectives: ['Calculate incline ratios'], keyVocabulary: [{ term: 'Gradient', definition: 'Steepness and slope of a line' }], curriculumStandards: [] },
          { id: 'm9_m2', title: 'Pythagorean Theorem', description: 'Right angle triangular sides equations', grade: 'Grade 9', subject: 'Mathematics', learningObjectives: ['Calculate hypotesuses values'], keyVocabulary: [{ term: 'Hypotenuse', definition: 'The longest side opposite right angle' }], curriculumStandards: [] },
          { id: 'm9_m3', title: 'Factorising Expressions', description: 'Extracting common mathematical factors and polynomials', grade: 'Grade 9', subject: 'Mathematics', learningObjectives: ['Isolate binomial products values'], keyVocabulary: [{ term: 'Factorise', definition: 'Decomposing algebraic structures to product components' }] }
        ] },
        { name: 'English', topics: [
          { id: 'e9_1', title: 'Media Propaganda Analysis', description: 'Deconstructing biased headlines, advertising, and opinions in press', grade: 'Grade 9', subject: 'English', learningObjectives: ['Identify manipulative editorial angles'], keyVocabulary: [{ term: 'Propaganda', definition: 'Biased communication to sway public opinions' }] },
          { id: 'e9_2', title: 'Direct and Indirect Speech', description: 'Tense shifts when converting quotes to reported formats', grade: 'Grade 9', subject: 'English', learningObjectives: ['Formulate reported speeches statements perfectly'], keyVocabulary: [{ term: 'Quotes', definition: 'Exact words stated by active dialogue speakers' }] }
        ] },
        { name: 'Sesotho', topics: [
          { id: 's9_1', title: 'Thutamabolelo e Moholo', description: 'Advanced grammar constructions, conjunctions, and sentence types', grade: 'Grade 9', subject: 'Sesotho', learningObjectives: ['Differentiate conjunction structures'], keyVocabulary: [{ term: 'Kopanyo', definition: 'Conjunction binding phrases' }] },
          { id: 's9_2', title: 'Maele a Botlalo', description: 'Advanced Sesotho proverbs tracking cattle, wars, and nature idioms', grade: 'Grade 9', subject: 'Sesotho', learningObjectives: ['Translate historical folklore meaning to modern context'], keyVocabulary: [{ term: 'Maele', definition: 'Coded cultural idioms' }] }
        ] },
        { name: 'Physical Science', topics: [
          { id: 'ps9_1', title: 'Acids and Bases', description: 'Neutralization reaction formulas, titration, and pH profiles', grade: 'Grade 9', subject: 'Physical Science', learningObjectives: ['Formulate salt + water products equilibrium'], keyVocabulary: [{ term: 'Titration', definition: 'Measuring neutralization concentration endpoint' }] },
          { id: 'ps9_2', title: 'The Wave Spectrum', description: 'Comparing Longitudinal sonic waves with Transverse light vectors', grade: 'Grade 9', subject: 'Physical Science', learningObjectives: ['Calculate wave velocity from frequency limits'], keyVocabulary: [{ term: 'Wavelength', definition: 'Interval range between two corresponding crests' }] }
        ] },
        { name: 'Life Sciences', topics: [
          { id: 'ls9_1', title: 'DNA and Genetic Blueprints', description: 'Introduction to genetic codes, cell mutations, and inheritance pathways', grade: 'Grade 9', subject: 'Life Sciences', learningObjectives: ['Distinguish physical genotype from phenotype expressions'], keyVocabulary: [{ term: 'Chromosome', definition: 'DNA thread storing biological instructions' }] },
          { id: 'ls9_2', title: 'Ecosystems Interaction', description: 'Food webs, nutrient cycles, and abiotic factors limitations', grade: 'Grade 9', subject: 'Life Sciences', learningObjectives: ['Deconstruct bio-mass energy pyramids ratios'], keyVocabulary: [{ term: 'Abiotic', definition: 'Non-living physical parameters like water or wind' }] }
        ] },
        { name: 'Social Sciences', topics: [
          { id: 'ss9_1', title: 'Settlement Topographies', description: 'Urbanized vs rural settlements mapping, layouts, and topography contours', grade: 'Grade 9', subject: 'Social Sciences', learningObjectives: ['Decipher layout boundaries in topographical maps'], keyVocabulary: [{ term: 'Topography', definition: 'Detailed physical features mapping of land' }] },
          { id: 'ss9_2', title: 'World War I and Southern Africa', description: 'Causes of WWI, alliances, and the historical sinking of the SS Mendi', grade: 'Grade 9', subject: 'Social Sciences', learningObjectives: ['Relate SS Mendi story to veteran military contributions'], keyVocabulary: [{ term: 'Alliance', definition: 'Treaty-bound military coordination of states' }] }
        ] },
        { name: 'Business Studies', topics: [
          { id: 'bs9_1', title: 'Entrepreneurship Planning', description: 'Formulating viable small business structures, marketing, SWOT, and cash flow forecasts', grade: 'Grade 9', subject: 'Business Studies', learningObjectives: ['Formulate basic SWOT plans'], keyVocabulary: [{ term: 'SWOT', definition: 'Assessment of Strengths, Weaknesses, Opportunities, Threats' }] },
          { id: 'bs9_2', title: 'Ledger accounts and bookkeeping', description: 'Balancing double ledger entries, trial balances, and journals entries', grade: 'Grade 9', subject: 'Business Studies', learningObjectives: ['Formulate a basic trial balance summary'], keyVocabulary: [{ term: 'Ledger', definition: 'Financial account log containing debit and credit sides' }] }
        ] }
      ] 
    },
    { 
      grade: 'Grade 10', 
      subjects: [
        { name: 'Mathematics', topics: [
          { id: 'm5_g10', title: 'Trigonometric Ratios', description: 'SOH CAH TOA rules for angular calculations', grade: 'Grade 10', subject: 'Mathematics', learningObjectives: ['Solve sine ratios for unknown sides'], keyVocabulary: [{ term: 'Sine', definition: 'Opposite side divided by hypotenuse' }], curriculumStandards: [] },
          { id: 'm10_m2', title: 'Analytical Geometry', description: 'Cartesian distances, slopes, and midpoints rules', grade: 'Grade 10', subject: 'Mathematics', learningObjectives: ['Apply midpoint coordinates formula'], keyVocabulary: [{ term: 'Cartesian', definition: 'Coordinate plane containing orthogonal x,y axes' }], curriculumStandards: [] },
          { id: 'm10_m3', title: 'Quadratic Functions Plots', description: 'Graphing parabolas y = ax^2 + q and locating turns', grade: 'Grade 10', subject: 'Mathematics', learningObjectives: ['Find symmetry alignments values'], keyVocabulary: [{ term: 'Parabola', definition: 'Symmetric curve shaped like an arch or valley' }] }
        ] },
        { name: 'English', topics: [
          { id: 'e10_1', title: 'Historical Prose and Drama', description: 'Introduction to Shakespeare and classic literature stanzas', grade: 'Grade 10', subject: 'English', learningObjectives: ['Analyze structural blank verse meters'], keyVocabulary: [{ term: 'Soliloquy', definition: 'A character speaking their thoughts out loud alone' }] },
          { id: 'e10_2', title: 'Formal Letter Composition', description: 'Composing formal letters applying block formats, salutations, objective registry', grade: 'Grade 10', subject: 'English', learningObjectives: ['Draft coherent business letters'], keyVocabulary: [{ term: 'Salutation', definition: 'Polite greeting establishing letter openings' }] }
        ] },
        { name: 'Sesotho', topics: [
          { id: 's10_1', title: 'Mahlale a Sesotho', description: 'Explorations in historical Sesotho proverbs and writing conventions', grade: 'Grade 10', subject: 'Sesotho', learningObjectives: ['Differentiate literal from metaphorical Sesotho phrases'], keyVocabulary: [{ term: 'Maele', definition: 'Cultural idioms of Sesotho' }] },
          { id: 's10_2', title: 'Moetlo le Lelapa', description: 'Societal systems, lobola traditions, and community gatherings', grade: 'Grade 10', subject: 'Sesotho', learningObjectives: ['State three cultural benefits of community ties'], keyVocabulary: [{ term: 'Lobola', definition: 'Traditional Basotho bride price custom' }] }
        ] },
        { name: 'Physics', topics: [
          { id: 'ps1_g10', title: 'Mechanics & Force', description: 'Friction coefficients, resultant vectors, and force balances', grade: 'Grade 10', subject: 'Physics', learningObjectives: ['Calculate net forces across inclined plane axes'], keyVocabulary: [{ term: 'Friction', definition: 'Force resisting sliding relative motion' }], curriculumStandards: [] },
          { id: 'ps1_g10_2', title: 'Electric Circuits Ohm\'s Law', description: 'Calculating current, voltage, and resistance in parallel systems', grade: 'Grade 10', subject: 'Physics', learningObjectives: ['Solve series-parallel compound equations resistors'], keyVocabulary: [{ term: 'Resistance', definition: 'Substance metric measuring opposition to electric flows' }] }
        ] },
        { name: 'Chemistry', topics: [
          { id: 'ch10_1', title: 'The Mole Concept', description: 'Using Avogadro\'s number in stoichiometry calculations', grade: 'Grade 10', subject: 'Chemistry', learningObjectives: ['Convert atomic weight masses to mole counts'], keyVocabulary: [{ term: 'Mole', definition: 'Chemical unit representing substance particle count' }] },
          { id: 'ch10_2', title: 'Chemical Bond Types', description: 'Covalent sharing, Ionic transfers, and Metallic bonds electron flows', grade: 'Grade 10', subject: 'Chemistry', learningObjectives: ['Draw Lewis dot diagrams of simple covalent molecules'], keyVocabulary: [{ term: 'Covalent', definition: 'Chemical bond sharing valence electron pairs' }] }
        ] },
        { name: 'Life Sciences', topics: [
          { id: 'ls10_1', title: 'Cells Structure and Function', description: 'Organelles of plant and animal tissue foundations and division', grade: 'Grade 10', subject: 'Life Sciences', learningObjectives: ['Differentiate mitochondria roles from chloroplast structures'], keyVocabulary: [{ term: 'Organelle', definition: 'Specialized structure within a living cell' }] },
          { id: 'ls10_2', title: 'The Biomes of Southern Africa', description: 'Fynbos, grasslands, savannah, and Karoo ecological adaptions', grade: 'Grade 10', subject: 'Life Sciences', learningObjectives: ['Relate average rainfall levels to vegetation adaptions'], keyVocabulary: [{ term: 'Biome', definition: 'Large geographical region of distinct biodiversity and climate' }] }
        ] },
        { name: 'Geography', topics: [
          { id: 'g10_1', title: 'Mapwork and Scales', description: 'Interpreting geographic contours, scales conversions, and bearings', grade: 'Grade 10', subject: 'Geography', learningObjectives: ['Calculate true geographic bearing limits'], keyVocabulary: [{ term: 'Contour', definition: 'Line on a map linking equal outer heights' }] },
          { id: 'g10_2', title: 'Geomorphology & Rocks', description: 'Comparing Igneous, Sedimentary, and Metamorphic rock structures formation', grade: 'Grade 10', subject: 'Geography', learningObjectives: ['Identify erosion factors altering igneous rock profiles'], keyVocabulary: [{ term: 'Metamorphic', definition: 'Rock structure mutated under massive heat and weight' }] }
        ] },
        { name: 'Accounting', topics: [
          { id: 'ac10_1', title: 'General Journals ledger', description: 'Recording commercial sales ledger adjustments and double balances', grade: 'Grade 10', subject: 'Accounting', learningObjectives: ['Balance a double entry ledger profile'], keyVocabulary: [{ term: 'Ledger', definition: 'Book or file storing financial account entries' }] },
          { id: 'ac10_2', title: 'Salaries and wages journals', description: 'Calculating gross income, PAYE taxes, UIF, and net earnings columns', grade: 'Grade 10', subject: 'Accounting', learningObjectives: ['Determine net pay calculations from salary rates'], keyVocabulary: [{ term: 'Net Pay', definition: 'Disposable income remaining after all statutory deductions' }] }
        ] },
        { name: 'Economics', topics: [
          { id: 'ec10_1', title: 'Concept of Scarcity', description: 'Opportunity cost and productive efficiency models and curves', grade: 'Grade 10', subject: 'Economics', learningObjectives: ['Illustrate cost factors using production boundaries curves'], keyVocabulary: [{ term: 'Scarcity', definition: 'Unlimited human wants meeting limited physical resources' }] },
          { id: 'ec10_2', title: 'The Circular Flow Model', description: 'Tracing material and currency exchanges between companies, consumers, state, and banks', grade: 'Grade 10', subject: 'Economics', learningObjectives: ['Identify leakage and injection factors on flow layouts'], keyVocabulary: [{ term: 'Injection', definition: 'Exogenous financial inputs like state funding or exports' }] }
        ] }
      ] 
    },
    { 
      grade: 'Grade 11', 
      subjects: [
        { name: 'Mathematics', topics: [
          { id: 'm6_g11', title: 'Quadratic Equations', description: 'Using quadratic formula to solve roots and complex factors', grade: 'Grade 11', subject: 'Mathematics', learningObjectives: ['Solve complex imaginary roots structures'], keyVocabulary: [{ term: 'Discriminant', definition: 'Expression under square root in quadratic formula' }], curriculumStandards: [] },
          { id: 'm11_m2', title: 'Circle Theorems', description: 'Angles subtended over circular geometries geometric shapes', grade: 'Grade 11', subject: 'Mathematics', learningObjectives: ['Prove center angles doubling circumference vertices'], keyVocabulary: [{ term: 'Chord', definition: 'Straight line segment connecting circular boundaries' }], curriculumStandards: [] },
          { id: 'm11_m3', title: 'Trig Functions & identities', description: 'Plotting sine, cosine waves, and applying compound reduction formulas', grade: 'Grade 11', subject: 'Mathematics', learningObjectives: ['Simplify trig ratio segments with reduction identities'], keyVocabulary: [{ term: 'Identity', definition: 'Algebra formula asserting equality for all value ranges' }] }
        ] },
        { name: 'English', topics: [
          { id: 'e11_1', title: 'Reading Comprehension Register', description: 'Tone shifts, complex vocabulary context tracking, and objective bias', grade: 'Grade 11', subject: 'English', learningObjectives: ['Identify emotional vs objective bias shifts'], keyVocabulary: [{ term: 'Register', definition: 'Degree of formality in written communication' }] },
          { id: 'e11_2', title: 'Speech Delivery rhetoric', description: 'Composing highly persuasive speeches using rhetorical questions and emotional appeal', grade: 'Grade 11', subject: 'English', learningObjectives: ['Incorporate rule of three and antithesis in speeches'], keyVocabulary: [{ term: 'Antithesis', definition: 'Contrast of corresponding words in parallel phrases' }] }
        ] },
        { name: 'Sesotho', topics: [
          { id: 's11_1', title: 'Thokolo e Atlehileng', description: 'Deep analysis of historic Basotho warrior praise poetry and structures', grade: 'Grade 11', subject: 'Sesotho', learningObjectives: ['Critique rhyme patterns in war praise books'], keyVocabulary: [{ term: 'Lithoko', definition: 'Traditional Basotho praise poems' }] },
          { id: 's11_2', title: 'Puisano le Ditieho', description: 'Creating formal traditional dialogues using respectful Sesotho vocabularies', grade: 'Grade 11', subject: 'Sesotho', learningObjectives: ['Formulate advanced dialogues matching hierarchy standards'], keyVocabulary: [{ term: 'Hlonipha', definition: 'Respectful linguistic rules in Sesotho communities' }] }
        ] },
        { name: 'Physics', topics: [
          { id: 'ph11_1', title: 'Newtonian Laws of Motion', description: 'Applying F=ma to composite acceleration vectors and incline calculations', grade: 'Grade 11', subject: 'Physics', learningObjectives: ['Solve tension calculations within rope pulleys'], keyVocabulary: [{ term: 'Acceleration', definition: 'Rate of velocity change over direction coordinates' }], curriculumStandards: [] },
          { id: 'ph11_2', title: 'Electrostatics Forces', description: 'Applying Coulomb\'s inverse-square formula to charge structures', grade: 'Grade 11', subject: 'Physics', learningObjectives: ['Calculate force direction vectors around positive charges'], keyVocabulary: [{ term: 'Coulomb', definition: 'Statutory SI unit of charge measurements' }] }
        ] },
        { name: 'Chemistry', topics: [
          { id: 'ch11_1', title: 'Organic Chemistry Naming', description: 'Functional group structures in alkanes, alkenes, esters, and alcohols', grade: 'Grade 11', subject: 'Chemistry', learningObjectives: ['Draw isomer branches of complex carbon bonds'], keyVocabulary: [{ term: 'Isomer', definition: 'Compounds with equal molecular formula but different layout' }] },
          { id: 'ch11_2', title: 'Intermolecular forces', description: 'Hydrogen bounds, London dispersion forces, and dipole attractions', grade: 'Grade 11', subject: 'Chemistry', learningObjectives: ['Relate physical boiling points to hydrogen bounds counts'], keyVocabulary: [{ term: 'Dipole', definition: 'separation of opposite charges within molecules' }] }
        ] },
        { name: 'Life Sciences', topics: [
          { id: 'ls11_1', title: 'Photosynthesis Biochemical Loop', description: 'Light-dependent reactions, Calvin Cycle, and sugar production structures', grade: 'Grade 11', subject: 'Life Sciences', learningObjectives: ['Examine ATP synthase electron paths'], keyVocabulary: [{ term: 'Chloroplast', definition: 'Organelle containing green pigments to perform absorption' }] },
          { id: 'ls11_2', title: 'Biodiversity of plants', description: 'Bryophytes, Pteridophytes, Gymnosperms, and Angiosperms adaptions', grade: 'Grade 11', subject: 'Life Sciences', learningObjectives: ['Illustrate vascular tissue progress over evolutionary branches'], keyVocabulary: [{ term: 'Vascular', definition: 'Internal fluid distribution tubes in advanced plant classes' }] }
        ] },
        { name: 'Geography', topics: [
          { id: 'g11_1', title: 'Global Climatology Weather Patterns', description: 'Coriolis impact, pressure bands, and global jet winds paths', grade: 'Grade 11', subject: 'Geography', learningObjectives: ['Explain Hadley cell circulation lines'], keyVocabulary: [{ term: 'Coriolis', definition: 'Deflection of global winds caused by Earth rotation' }] },
          { id: 'g11_2', title: 'Structural Hydrology', description: 'Basin catchments, erosion curves, and stream patterns layouts', grade: 'Grade 11', subject: 'Geography', learningObjectives: ['Identify dendritic vs trellis drainage networks'], keyVocabulary: [{ term: 'Catchment', definition: 'Spatially bounded land areas draining localized precipitation' }] }
        ] },
        { name: 'Accounting', topics: [
          { id: 'ac11_1', title: 'Partnerships Financial Statements', description: 'Balance division, income statement, and partner capital ledger lists', grade: 'Grade 11', subject: 'Accounting', learningObjectives: ['State distribution rates in partner current accounts'], keyVocabulary: [{ term: 'Capital', definition: 'Financial assets used to fund corporate setups' }] },
          { id: 'ac11_2', title: 'Cash budgets forecasting', description: 'Simulating projected monthly inflows and disbursements spreadsheets', grade: 'Grade 11', subject: 'Accounting', learningObjectives: ['Forecast closing balances with debtor payment schedules'], keyVocabulary: [{ term: 'Disbursements', definition: 'Active Cash payouts scheduled by treasury units' }] }
        ] },
        { name: 'Economics', topics: [
          { id: 'ec11_1', title: 'Price Elasticity of Demand', description: 'Formulating coefficient rates for pricing variations and revenue outcomes', grade: 'Grade 11', subject: 'Economics', learningObjectives: ['Identify conditions of perfectly inelastic demand limits'], keyVocabulary: [{ term: 'Elasticity', definition: 'Responsiveness of trading volumes to price updates' }] },
          { id: 'ec11_2', title: 'Business Market Structures', description: 'Monopoly, Oligopoly, and Perfect Competition profiles', grade: 'Grade 11', subject: 'Economics', learningObjectives: ['Examine entry barriers across oligopolistic markets'], keyVocabulary: [{ term: 'Oligopoly', definition: 'Market sector cornered by a handful of large producers' }] }
        ] }
      ] 
    },
    { 
      grade: 'Grade 12', 
      subjects: [
        { name: 'Mathematics', topics: [
          { id: 'm7_g12', title: 'Calculus and Differentiation', description: 'Using limits to locate slopes tangent to curves, rate of change calculations', grade: 'Grade 12', subject: 'Mathematics', learningObjectives: ['Calculate derivatives derivatives rules'], keyVocabulary: [{ term: 'Derivative', definition: 'Instantaneous rate of curve change profile' }], curriculumStandards: [] },
          { id: 'm12_m2', title: 'Financial Capital Maths', description: 'Calculating compound sinking fund payments and annuity plans', grade: 'Grade 12', subject: 'Mathematics', learningObjectives: ['Evaluate future worth amortizations with interest adjustments'], keyVocabulary: [{ term: 'Annuity', definition: 'Fixed sum of money paid over regular intervals' }], curriculumStandards: [] },
          { id: 'm12_m3', title: 'Probability & Distributions', description: 'Venn diagrams, complex factorial permutations, and Bayes logic', grade: 'Grade 12', subject: 'Mathematics', learningObjectives: ['Formulate arrangement counts of variable letters'], keyVocabulary: [{ term: 'Permutations', definition: 'Count of potential arrangements where ordering is critical' }] }
        ] },
        { name: 'English', topics: [
          { id: 'e12_1', title: 'Critical Prose Rhetoric', description: 'Deconstructing language manipulation in public channels and political writing', grade: 'Grade 12', subject: 'English', learningObjectives: ['Verify logical fallacies within text samples'], keyVocabulary: [{ term: 'Fallacy', definition: 'Flawed logical framing rendering arguments invalid' }] },
          { id: 'e12_2', title: 'Literary Critique writing', description: 'Writing academic critiques of novels focusing on characterization, context, and motifs', grade: 'Grade 12', subject: 'English', learningObjectives: ['Deconstruct subtextual themes of oppression in classics'], keyVocabulary: [{ term: 'Motif', definition: 'Recurrent key elements or symbols within written prose' }] }
        ] },
        { name: 'Sesotho', topics: [
          { id: 's12_1', title: 'Sesotho sa Lilemo', description: 'Synthesizing advanced regional dialects and modern evolution of poetry', grade: 'Grade 12', subject: 'Sesotho', learningObjectives: ['Address lexical shift indicators within classic verses'], keyVocabulary: [{ term: 'Puo', definition: 'Language or tongue context' }] },
          { id: 's12_2', title: 'Sengoli sa Mehleng', description: 'Examining changes in modern prose compared to early tales', grade: 'Grade 12', subject: 'Sesotho', learningObjectives: ['Synthesize style transformations across centuries'], keyVocabulary: [{ term: 'Sengoli', definition: 'Socio-cultural writer or novelist' }] }
        ] },
        { name: 'Physics', topics: [
          { id: 'ph12_1', title: 'Electromagnetism Induction', description: 'Faraday\'s and Lenz\'s laws formulas, flux changes, and generators mechanics', grade: 'Grade 12', subject: 'Physics', learningObjectives: ['Calculate induced electromagnetic force EMF directions'], keyVocabulary: [{ term: 'Induction', definition: 'Voltage generation from variable magnetic magnetic flows' }], curriculumStandards: [] },
          { id: 'ph12_2', title: 'Doppler Effect vectors', description: 'Changes in observed sound frequency caused by high speed moving sources', grade: 'Grade 12', subject: 'Physics', learningObjectives: ['Calculate sirens frequencies shifted by vehicle velocity'], keyVocabulary: [{ term: 'Doppler', definition: 'The pitch frequency shifts caused by physical motion' }] }
        ] },
        { name: 'Chemistry', topics: [
          { id: 'ch12_1', title: 'Chemical Equilibrium Dynamics', description: 'Le Chatelier principle and Kc ratios constants and temperature shifts', grade: 'Grade 12', subject: 'Chemistry', learningObjectives: ['Forecast equilibrium shifts caused by compression stressors'], keyVocabulary: [{ term: 'Equilibrium', definition: 'Balanced state where forward and backward rates match' }] },
          { id: 'ch12_2', title: 'Galvanic and Electrolytic Cells', description: 'Oxidation-reduction transfers, salt bridge circuits, and cell voltages', grade: 'Grade 12', subject: 'Chemistry', learningObjectives: ['Determine anode vs cathode oxidation locations'], keyVocabulary: [{ term: 'Electrolysis', definition: 'Driving non-spontaneous ionic reactions via external currents' }] }
        ] },
        { name: 'Life Sciences', topics: [
          { id: 'ls12_1', title: 'Homeostatic Regulators', description: 'Negative feedback systems keeping bodily balance, thermoregulation, and insulin control', grade: 'Grade 12', subject: 'Life Sciences', learningObjectives: ['Model hormonal insulin concentration adjustments'], keyVocabulary: [{ term: 'Homeostasis', definition: 'Endogenous stability maintained dynamically by biological bodies' }] },
          { id: 'ls12_2', title: 'Human Endocrine Loop', description: 'Glands location, adrenaline pathways, and pituitary regulatory master indicators', grade: 'Grade 12', subject: 'Life Sciences', learningObjectives: ['Map hormone secretions to correct metabolic glands'], keyVocabulary: [{ term: 'Hormone', definition: 'biochemical messenger circulating in bloodstream' }] }
        ] },
        { name: 'Geography', topics: [
          { id: 'g12_1', title: 'Development Geography Indicators', description: 'Measuring Human Development Index HDI globally, PPP indices, and growth barriers', grade: 'Grade 12', subject: 'Geography', learningObjectives: ['Deconstruct GDP PPP metrics as development indicators'], keyVocabulary: [{ term: 'HDI', definition: 'Composite rating tracking life expectancy, education, and cash indices' }] },
          { id: 'g12_2', title: 'Climatology Tropics and Cyclons', description: 'Mid-latitude cyclone formation, fronts, cold fronts, and pressure cells', grade: 'Grade 12', subject: 'Geography', learningObjectives: ['Examine clockwise rotation forces of low pressure cyclones'], keyVocabulary: [{ term: 'Cyclone', definition: 'Massive rotating low pressure wind system loaded with rain' }] }
        ] },
        { name: 'Accounting', topics: [
          { id: 'ac12_1', title: 'Manufacturing Cost Statements', description: 'Factory cost allocation ledger patterns, overheads, and stock logs', grade: 'Grade 12', subject: 'Accounting', learningObjectives: ['Formulate full manufacturing balance spreadsheets'], keyVocabulary: [{ term: 'Overheads', definition: 'Indirect factory operations cost items' }] },
          { id: 'ac12_2', title: 'Company financial reporting', description: 'Cash flow statements, balance sheets, and audit reports interpretation', grade: 'Grade 12', subject: 'Accounting', learningObjectives: ['Analyze liquidity ratios of stock operations'], keyVocabulary: [{ term: 'Liquidity', definition: 'Business capacity to pay immediate debtors using cash assets' }] }
        ] },
        { name: 'Economics', topics: [
          { id: 'ec12_1', title: 'National Income Calculations', description: 'Evaluating GDP using Expenditure and Output approaches, GNP and multipliers', grade: 'Grade 12', subject: 'Economics', learningObjectives: ['Determine Gross National Disposable Income coefficients'], keyVocabulary: [{ term: 'GDP', definition: 'Gross Domestic Product value of complete regional output' }] },
          { id: 'ec12_2', title: 'Foreign Exchange Markets', description: 'Balance of payments, exchange rate mechanisms, and trading reserves', grade: 'Grade 12', subject: 'Economics', learningObjectives: ['Analyze currency depreciation causes in central accounts'], keyVocabulary: [{ term: 'Depreciation', definition: 'Loss of global purchasing valuation of currency against foreign cash' }] }
        ] }
      ] 
    }
  ]
};

export const allGrades = [
  ...curriculumData.primary,
  ...curriculumData.highSchool
];
