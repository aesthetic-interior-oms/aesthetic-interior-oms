CREATE TABLE "WebsiteTeamMember" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "image" TEXT NOT NULL,
  "specialty" TEXT NOT NULL,
  "quote" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WebsiteTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebsiteTeamMember_isPublished_sortOrder_idx" ON "WebsiteTeamMember"("isPublished", "sortOrder");

INSERT INTO "WebsiteTeamMember" ("id", "name", "role", "image", "specialty", "quote", "sortOrder") VALUES
  ('nazrul-islam', 'Nazrul Islam', 'General Manager', '/user/User1.jpg', 'Administration Department', 'We believe every project should reflect trust, clarity, and long-term value for our clients.', 0),
  ('arup-ratan-mandal', 'Arup Ratan Mandal', 'Assistant General Manager', '/user/User4.jpg', 'Administration Department', 'Our strength is teamwork, where every department works together to deliver a smooth client experience.', 1),
  ('jannatul-ferdous-urmi', 'Jannatul Ferdous Urmi', 'Senior Architect', '/user/User2.jpg', 'Architect Department', 'Good design starts with listening deeply and turning each client vision into functional beauty.', 2),
  ('james', 'James', 'Project Cordinator', '/user/User3.jpg', 'Execution Department', 'Execution quality and timeline discipline are the promises we bring to every project site.', 3),
  ('faima-shorna', 'Faima Shorna', 'HR Administration', '/user/User5.jpeg', 'Human Resources Department', 'A strong company culture helps us serve clients better and grow as a dependable design team.', 4),
  ('moriom-ritu', 'Moriom Ritu', 'Junior Executive', '/user/User6.jpeg', 'Client Relationship Management', 'Clear communication and care for client needs are at the center of everything we do.', 5),
  ('ovijit-chowdhury', 'Ovijit Chowdhury', 'Junior Architect', '/user/User7.jpeg', 'Architect Department', 'We focus on meaningful details so every space feels thoughtful, practical, and timeless.', 6);
