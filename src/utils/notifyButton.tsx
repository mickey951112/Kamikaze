import { Button, useToast } from "@chakra-ui/react";

export const NotifyButton = () => {
  const toast = useToast();

  const handleClick = () => {
    toast({
      title: "Notification",
      description: "This is a sample notification.",
      status: "info", // Can be "success", "error", "warning", or "info"
      duration: 5000,
      isClosable: true,
      position: "top", // Can be any valid position
    });
  };

  return <Button onClick={handleClick}>Show Notification</Button>;
};
