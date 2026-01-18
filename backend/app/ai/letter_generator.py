from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv(override=True)


client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])


def generate_letter_xml(
    company_name: str,
    company_website_url: str,
    privacy_policy_url: str,
    privacy_contact_email: str,
    product_or_service_used: str = "",
    user_full_name: str = "",
    user_email: str = "",
) -> str:
    """Generate letter XML using OpenAI API."""
    user_message = f"""Generate an opt-out letter with the following information:

- company_name: {company_name}
- company_website_url: {company_website_url}
- privacy_policy_url: {privacy_policy_url}
- privacy_contact_email: {privacy_contact_email}
"""
    
    if product_or_service_used:
        user_message += f"- product_or_service_used: {product_or_service_used}\n"
    if user_full_name:
        user_message += f"- user_full_name: {user_full_name}\n"
    if user_email:
        user_message += f"- user_email: {user_email}\n"
    
    user_message += "\nGenerate the letter in the required XML format."
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You generate opt-out request emails under Canada's PIPEDA.\n\n"
                    "CRITICAL RULES\n"
                    "- You MUST NOT guess or invent any email address, website URL, "
                    "privacy policy text, or legal claims about a specific company.\n"
                    "- You MUST NOT claim you \"found\" or \"checked\" anything online.\n"
                    "- You MUST use the EXACT privacy_contact_email provided in the "
                    "user message as the email_address in the output. Do NOT modify it.\n\n"
                    "OUTPUT REQUIREMENTS\n"
                    "Return EXACTLY the following XML format with no additional prose:\n\n"
                    "<result>\n"
                    "  <email_address>USE_THE_EXACT_EMAIL_FROM_USER_MESSAGE</email_address>\n"
                    "  <company_name>USE_THE_EXACT_COMPANY_NAME_FROM_USER_MESSAGE</company_name>\n"
                    "  <email_subject>PIPEDA request: limit third-party sharing "
                    "and access request</email_subject>\n"
                    "  <letter>\n"
                    "...email body here...\n"
                    "  </letter>\n"
                    "</result>\n\n"
                    "LETTER CONTENT RULES\n"
                    "- Write as an email to the privacy/data protection contact.\n"
                    "- Ask them to: stop disclosing/selling/sharing personal "
                    "information to third parties for advertising/analytics/data "
                    "brokerage; limit sharing to service providers strictly necessary; "
                    "provide a list of third parties/categories; confirm completion.\n"
                    "- Request: access to personal information held, purposes, sources, "
                    "retention, and third parties (as allowed under PIPEDA).\n"
                    "- Include: user identifiers ONLY if provided (name/email). "
                    "If not provided, use: \"Account email: [same as this email "
                    "sender]\" and DO NOT invent.\n"
                    "- Be professional and concise (max ~250 words).\n"
                    "- Do not cite or quote any policy text unless the user provided it.\n"
                    "- Do not threaten lawsuits. Do not mention Quebec law unless user "
                    "asked. Reference PIPEDA generally.\n"
                    "- The subject must be one line, e.g. \"PIPEDA request: limit "
                    "third-party sharing and access request\".\n\n"
                    "PARSING SAFETY\n"
                    "- Ensure all tags are present exactly once.\n"
                    "- Do not include angle brackets anywhere except the required tags."
                ),
            },
            {
                "role": "user",
                "content": user_message,
            }
        ]
    )
    
    if not response.choices or len(response.choices) == 0:
        raise ValueError("No response from OpenAI API")
    
    content = response.choices[0].message.content or ""
    
    if not content:
        raise ValueError("Empty response content from OpenAI API")
    
    return content


def parse_result_xml(xml_content: str) -> tuple[str, str, str, str]:
    """Parse the XML result and extract letter, email_address, company_name, email_subject."""
    content = xml_content.strip()
    
    # Check for MISSING_FIELDS
    if "<MISSING_FIELDS>" in content:
        raise ValueError("Missing required fields - cannot generate letter")
    
    # Parse the result XML
    if "<result>" not in content or "</result>" not in content:
        raise ValueError("Invalid XML format - missing <result> tag")
    
    try:
        # Extract email_address
        if "<email_address>" in content and "</email_address>" in content:
            email_address = content.split("<email_address>")[1].split("</email_address>")[0].strip()
        else:
            raise ValueError("Missing <email_address> tag")
        
        # Extract company_name
        if "<company_name>" in content and "</company_name>" in content:
            company_name = content.split("<company_name>")[1].split("</company_name>")[0].strip()
        else:
            raise ValueError("Missing <company_name> tag")
        
        # Extract email_subject
        if "<email_subject>" in content and "</email_subject>" in content:
            email_subject = content.split("<email_subject>")[1].split("</email_subject>")[0].strip()
        else:
            raise ValueError("Missing <email_subject> tag")
        
        # Extract letter
        if "<letter>" in content and "</letter>" in content:
            letter = content.split("<letter>")[1].split("</letter>")[0].strip()
        else:
            raise ValueError("Missing <letter> tag")
        
        return letter, email_address, company_name, email_subject
    except IndexError as e:
        raise ValueError(f"Failed to parse XML: {str(e)}")
