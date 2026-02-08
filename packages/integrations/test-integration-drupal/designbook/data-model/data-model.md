# Data Model

## Entities

### Service
A service offering the agency provides, such as Drupal development, design, or consulting. Each service has a description and highlights the benefits for potential clients.

### Project
A completed project in the portfolio, showcasing work done for a client. Includes project details, technologies used, and results achieved.

### TeamMember
A person on the agency team with a specific role and area of expertise. Presented on the About & Team page to build trust and credibility.

### BlogPost
An article or insight piece published for thought leadership. Written by a team member to demonstrate expertise and attract organic traffic.

### Page
A general content page such as the Homepage, About page, or any other standalone page managed through the CMS.

### ContactInquiry
A message submitted through the contact form by a potential client, optionally referencing a specific service they're interested in.

## Relationships

- Service has many Project
- Project belongs to one or more Service
- Project has many TeamMember
- TeamMember has many Project
- TeamMember has many Service
- BlogPost belongs to TeamMember
- Page is standalone
- ContactInquiry references Service
