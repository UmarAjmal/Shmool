import { redirect } from 'next/navigation';

export default function StudentsIndex() {
  redirect('/students/details');
}
