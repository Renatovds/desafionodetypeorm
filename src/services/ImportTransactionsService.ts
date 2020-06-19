import parseCSV from 'csv-parse';
import fs from 'fs';
import { In, getRepository } from 'typeorm';
import Category from '../models/Category';
import Transaction from '../models/Transaction';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filepath: string): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getRepository(Transaction);
    const csvStream = fs.createReadStream(filepath);

    const parses = parseCSV({ from_line: 2 });
    const categories: string[] = [];
    const transactions: CSVTransaction[] = [];

    const parsedCSV = csvStream.pipe(parses).on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!title || !type || !value) return;
      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    console.log(transactions);

    await new Promise(resolve => parsedCSV.on('end', resolve));
    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });
    const existentCategoriesTitles = existentCategories.map(
      category => category.title,
    );
    const addCategories = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, array) => array.indexOf(value) === index);

    const createdCategories = categoriesRepository.create(
      addCategories.map(category => {
        return { title: category };
      }),
    );
    await categoriesRepository.save(createdCategories);

    const allCategories = [...createdCategories, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
