import { getPublications, getIssues, archiveNote } from '../src/lib/publications.mjs';

process.stdout.write(JSON.stringify(getPublications().map(publication=>({...publication,issues:getIssues(publication.slug).map(issue=>({...issue,archiveNote:archiveNote(issue)}))}))));
