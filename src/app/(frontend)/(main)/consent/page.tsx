import type { Metadata } from 'next'
import { getCompany } from '@/lib/data'

export const revalidate = 60
export const metadata: Metadata = {
  title: 'Согласие на обработку персональных данных',
  description: 'Текст согласия на обработку имени и телефона, которое вы даёте, отправляя заявку на сайте «Хорошего дома».',
  alternates: { canonical: '/consent' },
}

// Since 01.09.2025 consent must be a separate document (152-FZ as amended by 156-FZ), hence its own page.
export default async function ConsentPage() {
  const c = await getCompany()
  const operator = c.legalName || `Строительная компания «${c.name}»`
  const details = [c.inn && `ИНН ${c.inn}`, c.ogrn && `ОГРН ${c.ogrn}`, c.legalAddress].filter(Boolean).join(', ') || '[ИНН, ОГРН, адрес]'
  return (
    <div className="container intro">
      <div className="prose">
        <h1 className="title title--lg">Согласие на обработку персональных данных</h1>
        {!c.inn && <p className="note">Шаблон. Перед запуском заполнить реквизиты оператора в админке и проверить у юриста.</p>}
        <p>
          Отправляя форму на сайте, я свободно, своей волей и в своём интересе даю {operator} ({details}) согласие на обработку моих персональных данных: имени и
          номера телефона.
        </p>
        <p>Цель обработки — связаться со мной по заявке, проконсультировать по покупке или строительству дома и ипотеке, организовать показ.</p>
        <p>
          Действия с данными: сбор, запись, систематизация, хранение, уточнение, использование, удаление. Обработка ведётся с использованием средств
          автоматизации и без них.
        </p>
        <p>Согласие действует до достижения цели обработки и может быть отозвано письмом на {c.email}.</p>
      </div>
    </div>
  )
}
