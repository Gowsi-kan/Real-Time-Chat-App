import { nanoid } from "nanoid";
import { useEffect, useState } from "react";

const STORAGE_KEY = "username";
const ANIMALS = ["eagle", "dog", "rabbit", "hamster", "hawk"];

const generateUsername = () => {
  const randomAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `anonymous-${randomAnimal}${nanoid(5)}`;
};

export const useUsername = () => {
  const [username, setUsername] = useState("");

  useEffect(() => {
    const main = () => {
      const storedUsername = localStorage.getItem(STORAGE_KEY);
      if (storedUsername) {
        setUsername(storedUsername);
        return;
      }

      const newUsername = generateUsername();
      setUsername(newUsername);
      localStorage.setItem(STORAGE_KEY, newUsername);
    };

    main();
  }, []);

  return { username };
};
